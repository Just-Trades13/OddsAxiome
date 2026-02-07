from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    return app
