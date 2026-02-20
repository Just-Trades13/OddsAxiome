import asyncio
import importlib
import os
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.core.config import settings
from src.core.redis import close_redis, init_redis
from src.core.security import init_firebase

logger = structlog.get_logger()

# Map worker names to their importable class paths
_WORKER_MAP = {
    "polymarket": "src.workers.polymarket.PolymarketWorker",
    "kalshi": "src.workers.kalshi.KalshiWorker",
    "predictit": "src.workers.predictit.PredictItWorker",
    "theoddsapi": "src.workers.theoddsapi.TheOddsAPIWorker",
}


def _start_workers(redis) -> list[asyncio.Task]:
    """Start data-ingestion workers as background asyncio tasks.

    Active sources: Polymarket, PredictIt (free), Kalshi, TheOddsAPI (keyed).
    TheOddsAPI covers DraftKings, FanDuel, BetMGM, Bovada, BetRivers.
    """
    sources = ["polymarket", "predictit"]

    if settings.kalshi_api_key:
        sources.append("kalshi")
    if settings.the_odds_api_key:
        sources.append("theoddsapi")

    tasks: list[asyncio.Task] = []
    for source in sources:
        try:
            dotted = _WORKER_MAP[source]
            mod_path, cls_name = dotted.rsplit(".", 1)
            mod = importlib.import_module(mod_path)
            worker_cls = getattr(mod, cls_name)
            worker = worker_cls(redis_pool=redis, config=settings)
            task = asyncio.create_task(worker.run(), name=f"worker-{source}")
            tasks.append(task)
            logger.info("Background worker started", source=source)
        except Exception as e:
            logger.warning("Could not start worker", source=source, error=str(e))

    return tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting OddsAxiom API", environment=settings.environment)
    redis = await init_redis()
    logger.info("Redis connected")
    init_firebase()
    logger.info("Firebase initialized")

    # Start ingestion workers so Redis gets populated with real market data
    worker_tasks: list[asyncio.Task] = []
    try:
        worker_tasks = _start_workers(redis)
        if worker_tasks:
            logger.info("Ingestion workers running", count=len(worker_tasks))
        else:
            logger.warning("No ingestion workers started -- site will show fallback data")
    except Exception as e:
        logger.error("Failed to start workers", error=str(e))

    # Background cache warmer: pre-builds the expensive odds response every 90s
    # so user requests always hit the fast cache path.
    async def _warm_odds_cache():
        from src.services.odds_service import get_all_live_odds
        await asyncio.sleep(60)  # wait for workers to publish first batch
        categories = [None, "politics", "economics", "crypto", "science", "culture", "sports"]
        while True:
            try:
                for cat in categories:
                    await get_all_live_odds(redis, page=1, per_page=1, category=cat)
                logger.debug("Odds response cache warmed")
            except Exception as e:
                logger.warning("Cache warm failed", error=str(e))
            await asyncio.sleep(90)

    cache_task = asyncio.create_task(_warm_odds_cache(), name="cache-warmer")

    yield

    # Shutdown — cancel workers + cache warmer, then close redis
    cache_task.cancel()
    for task in worker_tasks:
        task.cancel()
    if worker_tasks:
        await asyncio.gather(*worker_tasks, return_exceptions=True)
    await close_redis()
    logger.info("OddsAxiom API shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="OddsAxiom API",
        version="0.1.0",
        description="Prediction market analytics backend",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from src.api.v1.router import v1_router

    app.include_router(v1_router, prefix="/api/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "oddsaxiom-api"}

    # Serve React frontend static files
    static_dir = Path(__file__).resolve().parent.parent.parent / "static"
    if static_dir.is_dir():
        # Mount assets (JS, CSS, images) at /assets
        assets_dir = static_dir / "assets"
        if assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        # Catch-all: serve index.html for any non-API route (SPA routing)
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            # Try to serve the exact file first (e.g. favicon.ico, robots.txt)
            file_path = static_dir / full_path
            if full_path and file_path.is_file():
                return FileResponse(str(file_path))
            # Otherwise serve index.html for SPA client-side routing
            return FileResponse(str(static_dir / "index.html"))

    return app
