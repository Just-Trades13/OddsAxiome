"""Arbitrage opportunity endpoints — reads live arbs from Redis."""
import orjson
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query

from src.core.dependencies import TierGate, get_current_user
from src.core.redis import get_redis
from src.models.user import User

router = APIRouter()


@router.get("/opportunities")
async def list_arb_opportunities(
    category: str | None = None,
    min_profit: float = Query(0.0, ge=0.0),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get active arbitrage opportunities from Redis. Requires login."""
    # Get all arb keys sorted by profit (descending)
    arb_keys = await redis.zrevrange("arb:active", 0, -1)

    if not arb_keys:
        return {"data": [], "meta": {"page": page, "per_page": per_page, "total": 0, "total_pages": 0}}

    # Pipeline fetch all arb data
    pipe = redis.pipeline()
    for key in arb_keys:
        key_str = key if isinstance(key, str) else key.decode()
        pipe.hget(f"arb:opp:{key_str}", "data")
    results = await pipe.execute()

    # Parse and filter
    opportunities = []
    for raw in results:
        if not raw:
            continue
        try:
            data = orjson.loads(raw)
        except Exception:
            continue

        if category and data.get("category", "").lower() != category.lower():
            continue
        if data.get("expected_profit", 0) < min_profit:
            continue

        opportunities.append(data)

    # Paginate
    total = len(opportunities)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "data": opportunities[start:end],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }


@router.get("/opportunities/count")
async def arb_count(
    redis: aioredis.Redis = Depends(get_redis),
):
    """Public endpoint — just the count of active arb opportunities."""
    count = await redis.zcard("arb:active")
    return {"active_opportunities": count or 0}
