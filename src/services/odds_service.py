"""Odds data service — reads from Redis (live) and PostgreSQL (historical)."""
import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.odds import OddsSnapshot


async def get_live_odds_for_market(redis: aioredis.Redis, market_id: str) -> list[dict]:
    """Get live odds for a specific market from all platforms in Redis."""
    results = []

    # Scan for all platform keys for this market
    pattern = f"odds:live:*:{market_id}"
    async for key in redis.scan_iter(match=pattern):
        data = await redis.hgetall(key)
        if not data:
            continue

        platform = data.get("platform", "unknown")
        outcomes = []

        # Collect all outcomes from the hash
        i = 0
        while f"outcome_{i}_name" in data:
            outcomes.append({
                "outcome_index": i,
                "outcome_name": data.get(f"outcome_{i}_name", ""),
                "price": float(data.get(f"outcome_{i}_price", 0)),
                "implied_prob": float(data.get(f"outcome_{i}_implied", 0)),
                "bid": float(data[f"outcome_{i}_bid"]) if data.get(f"outcome_{i}_bid") else None,
                "ask": float(data[f"outcome_{i}_ask"]) if data.get(f"outcome_{i}_ask") else None,
            })
            i += 1

        results.append({
            "platform_slug": platform,
            "outcomes": outcomes,
            "volume_24h": float(data["volume_24h"]) if data.get("volume_24h") else None,
            "updated_at": data.get("updated_at"),
        })

    return results


async def get_all_live_odds(
    redis: aioredis.Redis,
    page: int = 1,
    per_page: int = 50,
    category: str | None = None,
) -> dict:
    """Get all live odds from Redis, grouped by market."""
    markets: dict[str, dict] = {}

    # Scan all live odds keys
    async for key in redis.scan_iter(match="odds:live:*"):
        data = await redis.hgetall(key)
        if not data:
            continue

        # Extract market title as grouping key
        title = data.get("market_title", "")
        if not title:
            continue

        mkt_category = data.get("category", "")

        # Filter by category if specified
        if category and mkt_category.lower() != category.lower():
            continue

        # Extract market_id from Redis key: odds:live:{platform}:{market_id}
        key_str = key if isinstance(key, str) else key.decode()
        parts = key_str.split(":", 3)
        market_id = parts[3] if len(parts) > 3 else ""

        if title not in markets:
            markets[title] = {
                "market_id": market_id,
                "market_title": title,
                "category": mkt_category,
                "market_url": data.get("market_url", ""),
                "platforms": [],
            }

        platform = data.get("platform", "unknown")
        outcomes = []
        i = 0
        while f"outcome_{i}_name" in data:
            outcomes.append({
                "outcome_index": i,
                "outcome_name": data.get(f"outcome_{i}_name", ""),
                "price": float(data.get(f"outcome_{i}_price", 0)),
                "implied_prob": float(data.get(f"outcome_{i}_implied", 0)),
            })
            i += 1

        markets[title]["platforms"].append({
            "platform_slug": platform,
            "outcomes": outcomes,
            "volume_24h": float(data["volume_24h"]) if data.get("volume_24h") else None,
            "liquidity_usd": float(data["liquidity_usd"]) if data.get("liquidity_usd") else None,
            "updated_at": data.get("updated_at"),
        })

    # Paginate
    all_markets = list(markets.values())
    total = len(all_markets)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "data": all_markets[start:end],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }


async def get_odds_history(
    db: AsyncSession,
    market_id: str,
    outcome_name: str | None = None,
    limit: int = 500,
) -> list[OddsSnapshot]:
    """Get historical odds snapshots from PostgreSQL."""
    query = (
        select(OddsSnapshot)
        .where(OddsSnapshot.market_id == market_id)
        .order_by(OddsSnapshot.captured_at.desc())
        .limit(limit)
    )

    if outcome_name:
        query = query.where(OddsSnapshot.outcome_name == outcome_name)

    result = await db.execute(query)
    return list(result.scalars().all())
