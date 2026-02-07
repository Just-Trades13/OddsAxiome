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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting OddsAxiom API", environment=settings.environment)
    await init_redis()
    logger.info("Redis connected")
    init_firebase()
    logger.info("Firebase initialized")
    yield
    # Shutdown
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
