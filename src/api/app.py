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

    # Start arbitrage engine as background task
    arb_task = None
    try:
        from src.arbengine.engine import ArbEngine
        arb_engine = ArbEngine(redis_pool=redis, config=settings)
        arb_task = asyncio.create_task(arb_engine.run(), name="arb-engine")
        logger.info("Arbitrage engine started")
    except Exception as e:
        logger.warning("Could not start arb engine", error=str(e))

    # Background odds snapshot writer: samples Redis live data every 5 minutes
    # and persists to PostgreSQL for historical price charts.
    PLATFORM_SLUG_TO_ID = {
        "polymarket": 1, "kalshi": 2, "predictit": 3,
        "draftkings": 4, "fanduel": 5, "betmgm": 6,
        "bovada": 7, "betrivers": 8,
    }

    async def _snapshot_odds():
        from src.core.database import async_session_factory
        await asyncio.sleep(120)  # Wait for workers to publish initial data
        while True:
            try:
                keys: list[str] = []
                async for key in redis.scan_iter(match="odds:live:*", count=500):
                    keys.append(key if isinstance(key, str) else key.decode())

                if not keys:
                    await asyncio.sleep(300)
                    continue

                # Pipeline all HGETALL calls
                pipe = redis.pipeline()
                for key in keys:
                    pipe.hgetall(key)
                all_data = await pipe.execute()

                rows = []
                for key, data in zip(keys, all_data):
                    if not data:
                        continue
                    parts = key.split(":", 3)
                    market_id = parts[3] if len(parts) > 3 else ""
                    platform_slug = data.get("platform", "")
                    platform_id = PLATFORM_SLUG_TO_ID.get(platform_slug, 0)

                    # Collect outcomes
                    i = 0
                    while f"outcome_{i}_name" in data:
                        name = data.get(f"outcome_{i}_name", "")
                        price_str = data.get(f"outcome_{i}_price", "0")
                        implied_str = data.get(f"outcome_{i}_implied", "0")
                        try:
                            price = float(price_str)
                            implied = float(implied_str)
                        except (ValueError, TypeError):
                            i += 1
                            continue
                        if implied <= 0:
                            i += 1
                            continue
                        rows.append({
                            "market_id": market_id,
                            "platform_id": platform_id,
                            "platform_slug": platform_slug,
                            "outcome_index": i,
                            "outcome_name": name,
                            "price": price,
                            "implied_prob": implied,
                        })
                        i += 1

                if rows:
                    # Batch insert via raw SQL for performance
                    async with async_session_factory() as session:
                        from sqlalchemy import text
                        insert_sql = text("""
                            INSERT INTO odds_snapshots
                            (market_id, platform_id, platform_slug, outcome_index, outcome_name, price, implied_prob)
                            VALUES (:market_id, :platform_id, :platform_slug, :outcome_index, :outcome_name, :price, :implied_prob)
                        """)
                        # Insert in batches of 500
                        for batch_start in range(0, len(rows), 500):
                            batch = rows[batch_start:batch_start + 500]
                            await session.execute(insert_sql, batch)
                        await session.commit()
                    logger.info("Odds snapshots saved", count=len(rows))
                else:
                    logger.debug("No odds data to snapshot")
            except Exception as e:
                logger.warning("Snapshot writer error", error=str(e))
            await asyncio.sleep(300)  # Every 5 minutes

    snapshot_task = asyncio.create_task(_snapshot_odds(), name="snapshot-writer")

    # Background notification producer: subscribes to arb alerts and pushes
    # notifications to all pro users' Redis lists.
    async def _notification_producer():
        import orjson
        from src.core.database import async_session_factory
        from sqlalchemy import text
        await asyncio.sleep(30)  # Wait for arb engine to start
        pubsub = redis.pubsub()
        await pubsub.subscribe("arb:alerts")
        logger.info("Notification producer subscribed to arb:alerts")
        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    alert = orjson.loads(message["data"])
                    arb_data = alert.get("data", {})
                    profit = arb_data.get("expected_profit", 0)
                    if profit < 0.005:  # Only notify for >0.5% arbs
                        continue

                    title = arb_data.get("market_title", "Unknown market")
                    legs = arb_data.get("legs", [])
                    leg_summary = " vs ".join(
                        f"{leg['platform']} ({leg['outcome_name']})"
                        for leg in legs[:2]
                    )
                    notification = orjson.dumps({
                        "type": "arb_alert",
                        "title": f"Arb: {profit:.2%} profit",
                        "body": f"{title[:80]} — {leg_summary}",
                        "data": arb_data,
                        "created_at": arb_data.get("detected_at"),
                    }).decode()

                    # Get all pro user IDs
                    async with async_session_factory() as session:
                        result = await session.execute(
                            text("SELECT id FROM users WHERE tier = 'pro' AND is_active = true")
                        )
                        user_ids = [str(row[0]) for row in result.fetchall()]

                    if user_ids:
                        pipe = redis.pipeline()
                        for uid in user_ids:
                            pipe.lpush(f"notifications:{uid}", notification)
                            pipe.ltrim(f"notifications:{uid}", 0, 49)  # Keep last 50
                            pipe.incr(f"notifications:{uid}:unread")
                        await pipe.execute()
                        logger.info("Arb notification sent", users=len(user_ids), profit=f"{profit:.2%}")
                except Exception as e:
                    logger.warning("Notification producer error", error=str(e))
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe("arb:alerts")

    notif_task = asyncio.create_task(_notification_producer(), name="notification-producer")

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

    # Shutdown — cancel all background tasks then close redis
    for t in [cache_task, snapshot_task, notif_task]:
        t.cancel()
    if arb_task:
        arb_task.cancel()
    for task in worker_tasks:
        task.cancel()
    all_tasks = [t for t in [*worker_tasks, arb_task, cache_task, snapshot_task, notif_task] if t]
    await asyncio.gather(*all_tasks, return_exceptions=True)
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
