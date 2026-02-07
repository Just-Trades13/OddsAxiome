"""Scheduler process — runs periodic background tasks.

Tasks:
- Cleanup old odds snapshots (every 6 hours)
- Mark stale markets inactive (every 24 hours)
"""
import asyncio
import structlog

from src.tasks.cleanup import prune_old_odds, mark_stale_markets

logger = structlog.get_logger()

CLEANUP_INTERVAL = 6 * 3600  # 6 hours
STALE_CHECK_INTERVAL = 24 * 3600  # 24 hours


async def cleanup_loop():
    """Run odds pruning every 6 hours."""
    while True:
        try:
            await prune_old_odds()
        except Exception as e:
            logger.error("Cleanup task failed", error=str(e))
        await asyncio.sleep(CLEANUP_INTERVAL)


async def stale_market_loop():
    """Check for stale markets every 24 hours."""
    while True:
        try:
            await mark_stale_markets()
        except Exception as e:
            logger.error("Stale market check failed", error=str(e))
        await asyncio.sleep(STALE_CHECK_INTERVAL)


async def main():
    logger.info("Scheduler starting", cleanup_interval_h=CLEANUP_INTERVAL // 3600,
                stale_check_interval_h=STALE_CHECK_INTERVAL // 3600)
    await asyncio.gather(
        cleanup_loop(),
        stale_market_loop(),
    )


if __name__ == "__main__":
    asyncio.run(main())
