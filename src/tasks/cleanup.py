"""Periodic cleanup tasks — prune old odds snapshots, expire stale data."""
import structlog
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import async_session_factory
from src.models.odds import OddsSnapshot
from src.models.market import Market

logger = structlog.get_logger()

# Keep 7 days of odds history for pro users
ODDS_RETENTION_DAYS = 7
# Markets with no updates in 30 days get marked inactive
MARKET_STALE_DAYS = 30


async def prune_old_odds():
    """Delete odds snapshots older than retention period."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=ODDS_RETENTION_DAYS)
    async with async_session_factory() as session:
        result = await session.execute(
            delete(OddsSnapshot).where(OddsSnapshot.captured_at < cutoff)
        )
        deleted = result.rowcount
        await session.commit()
        if deleted:
            logger.info("Pruned old odds snapshots", deleted=deleted, cutoff=cutoff.isoformat())


async def mark_stale_markets():
    """Mark markets with no recent odds data as inactive."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=MARKET_STALE_DAYS)
    async with async_session_factory() as session:
        # Find active markets with last_updated before cutoff
        result = await session.execute(
            select(Market)
            .where(Market.status == "active")
            .where(Market.updated_at < cutoff)
        )
        stale = result.scalars().all()
        for market in stale:
            market.status = "inactive"
        if stale:
            await session.commit()
            logger.info("Marked stale markets inactive", count=len(stale))


async def run_all_cleanup():
    """Run all cleanup tasks."""
    logger.info("Running scheduled cleanup")
    await prune_old_odds()
    await mark_stale_markets()
    logger.info("Cleanup complete")
