"""Entry point for the arbitrage detection engine."""
import asyncio
import signal

import structlog

logger = structlog.get_logger()


async def main():
    from src.core.config import settings
    from src.core.redis import init_redis, close_redis

    redis = await init_redis()
    logger.info("Arbitrage engine starting...")

    try:
        from src.arbengine.engine import ArbEngine
        engine = ArbEngine(redis_pool=redis, config=settings)
        await engine.run()
    except ImportError:
        logger.warning("ArbEngine not yet implemented. Waiting...")
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("Arb engine cancelled, shutting down...")
    finally:
        await close_redis()


if __name__ == "__main__":
    loop = asyncio.new_event_loop()

    def shutdown(sig, frame):
        logger.info(f"Received {sig}, shutting down...")
        for task in asyncio.all_tasks(loop):
            task.cancel()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
