"""Market browsing, categories, and trending — powered by Redis live data."""
from collections import Counter

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query

from src.core.redis import get_redis
from src.services.odds_service import get_all_live_odds

router = APIRouter()


@router.get("")
async def list_markets(
    category: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    redis: aioredis.Redis = Depends(get_redis),
):
    """List markets with optional category filter and search."""
    # Fetch a large page from Redis live odds (enough for filtering)
    result = await get_all_live_odds(redis, page=1, per_page=5000, category=category)
    all_markets = result.get("data", [])

    # Apply text search if provided
    if search:
        q = search.lower()
        all_markets = [m for m in all_markets if q in m.get("market_title", "").lower()]

    total = len(all_markets)
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "data": all_markets[start:end],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page if per_page else 1,
        },
    }


@router.get("/categories")
async def list_categories(redis: aioredis.Redis = Depends(get_redis)):
    """Get available categories with market counts from live data."""
    result = await get_all_live_odds(redis, page=1, per_page=5000)
    all_markets = result.get("data", [])

    counts = Counter(m.get("category", "unknown") for m in all_markets)
    return sorted(
        [{"category": cat, "count": cnt} for cat, cnt in counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )


@router.get("/trending")
async def trending_markets(
    limit: int = Query(20, ge=1, le=100),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get top markets by platform coverage (most cross-platform matches)."""
    result = await get_all_live_odds(redis, page=1, per_page=limit)
    # Already sorted by platform count descending in odds_service
    return result.get("data", [])[:limit]


@router.get("/{market_id}")
async def get_market(
    market_id: str,
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get a single market by its external ID."""
    from src.services.odds_service import get_live_odds_for_market

    platforms = await get_live_odds_for_market(redis, market_id)
    if not platforms:
        from src.core.exceptions import NotFoundError
        raise NotFoundError("Market not found")

    return {
        "market_id": market_id,
        "platforms": platforms,
    }
