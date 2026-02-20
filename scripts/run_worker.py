"""Entry point for ingestion workers. Run with: python scripts/run_worker.py --sources polymarket,kalshi"""
import argparse
import asyncio
import signal
import sys

import structlog

logger = structlog.get_logger()

AVAILABLE_WORKERS = {
    "polymarket": "src.workers.polymarket.PolymarketWorker",
    "kalshi": "src.workers.kalshi.KalshiWorker",
    "predictit": "src.workers.predictit.PredictItWorker",
    "theoddsapi": "src.workers.theoddsapi.TheOddsAPIWorker",
    "gemini": "src.workers.gemini.GeminiWorker",
    "coinbase": "src.workers.coinbase.CoinbaseWorker",
    "robinhood": "src.workers.robinhood.RobinhoodWorker",
    "limitless": "src.workers.limitless.LimitlessWorker",
    "draftkings": "src.workers.draftkings.DraftKingsWorker",
}


def import_worker_class(dotted_path: str):
    module_path, class_name = dotted_path.rsplit(".", 1)
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


async def main(sources: list[str]):
    from src.core.config import settings
    from src.core.redis import init_redis, close_redis

    redis = await init_redis()
    workers = []

    for source in sources:
        if source not in AVAILABLE_WORKERS:
            logger.error(f"Unknown worker source: {source}")
            continue
        try:
            worker_cls = import_worker_class(AVAILABLE_WORKERS[source])
            worker = worker_cls(redis_pool=redis, config=settings)
            workers.append(worker)
            logger.info(f"Loaded worker: {source}")
        except (ImportError, AttributeError) as e:
            logger.warning(f"Worker {source} not yet implemented: {e}")

    if not workers:
        logger.error("No workers loaded. Exiting.")
        return

    # Run all workers concurrently
    try:
        await asyncio.gather(*[w.run() for w in workers])
    except asyncio.CancelledError:
        logger.info("Workers cancelled, shutting down...")
    finally:
        for w in workers:
            w.stop()
        await close_redis()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run OddsAxiom ingestion workers")
    parser.add_argument("--sources", required=True, help="Comma-separated list of sources to run")
    args = parser.parse_args()

    sources = [s.strip() for s in args.sources.split(",")]
    logger.info(f"Starting workers for: {sources}")

    loop = asyncio.new_event_loop()

    def shutdown(sig, frame):
        logger.info(f"Received {sig}, shutting down...")
        for task in asyncio.all_tasks(loop):
            task.cancel()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        loop.run_until_complete(main(sources))
    finally:
        loop.close()
