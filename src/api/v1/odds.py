"""Live odds and historical odds endpoints."""
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import TierGate, get_optional_user
from src.core.redis import get_redis
from src.models.user import User
from src.services.odds_service import get_all_live_odds, get_live_odds_for_market, get_odds_history

router = APIRouter()


@router.get("/live")
async def live_odds(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get all live odds from Redis cache, grouped by market."""
    return await get_all_live_odds(redis, page=page, per_page=per_page)


@router.get("/live/{market_id}")
async def live_odds_for_market(
    market_id: str,
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get live odds for a specific market across all platforms."""
    return await get_live_odds_for_market(redis, market_id)


@router.get("/history/{market_id}")
async def odds_history(
    market_id: str,
    outcome: str | None = None,
    limit: int = Query(500, ge=1, le=5000),
    user: User = Depends(TierGate("pro")),
    db: AsyncSession = Depends(get_db),
):
    """Get historical odds snapshots. Requires Pro tier or above."""
    snapshots = await get_odds_history(db, market_id, outcome_name=outcome, limit=limit)
    return [
        {
            "captured_at": s.captured_at,
            "price": float(s.price),
            "implied_prob": float(s.implied_prob),
            "platform_id": s.platform_id,
            "outcome_name": s.outcome_name,
        }
        for s in snapshots
    ]
