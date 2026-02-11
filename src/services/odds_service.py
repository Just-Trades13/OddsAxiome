"""Odds data service — reads from Redis (live) and PostgreSQL (historical)."""
import orjson
import redis.asyncio as aioredis
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.arbengine.matcher import cluster_titles
from src.models.odds import OddsSnapshot

logger = structlog.get_logger()

# Cache key for the canonical title map (rebuilt every 60s)
_CANONICAL_MAP_KEY = "odds:canonical_map"
_CANONICAL_MAP_TTL = 60


async def _get_or_build_canonical_map(
    redis: aioredis.Redis,
    titles: list[str],
    categories: dict[str, str],
    title_platforms: dict[str, str],
) -> dict[str, str]:
    """Load canonical map from Redis cache, or build + cache it."""
    raw = await redis.get(_CANONICAL_MAP_KEY)
    if raw:
        try:
            return orjson.loads(raw)
        except Exception:
            pass

    # Build from scratch (platform-aware: same-platform=exact, cross-platform=fuzzy)
    cmap = cluster_titles(titles, categories, platforms=title_platforms)

    # Cache for next call
    try:
        await redis.set(_CANONICAL_MAP_KEY, orjson.dumps(cmap), ex=_CANONICAL_MAP_TTL)
    except Exception:
        pass

    # Log clustering stats
    from collections import Counter
    counts = Counter(cmap.values())
    multi = sum(1 for c in counts.values() if c > 1)
    if multi:
        logger.info("Market clustering", total=len(titles), clusters=len(counts), multi_platform=multi)

    return cmap


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
                "outcome_type": data.get(f"outcome_{i}_type", "binary"),
            })
            i += 1

        results.append({
            "platform_slug": platform,
            "outcomes": outcomes,
            "volume_24h": float(data["volume_24h"]) if data.get("volume_24h") else None,
            "updated_at": data.get("updated_at"),
        })

    return results


_RESPONSE_CACHE_TTL = 120  # seconds — workers publish every ~30s, but scan is expensive


async def get_all_live_odds(
    redis: aioredis.Redis,
    page: int = 1,
    per_page: int = 50,
    category: str | None = None,
) -> dict:
    """Get all live odds from Redis, grouped by matched market.

    Uses fuzzy event-key clustering so that the same market on different
    platforms (e.g. Polymarket + PredictIt) appears as a single entry
    with multiple platform rows.  Results are cached for 30s.
    """
    # Check response cache first
    cache_key = f"odds:response:{category or 'all'}"
    cached = await redis.get(cache_key)
    if cached:
        try:
            all_markets = orjson.loads(cached)
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
        except Exception:
            pass

    # Step 1: Collect all matching keys with SCAN
    keys: list[str] = []
    async for key in redis.scan_iter(match="odds:live:*", count=500):
        keys.append(key if isinstance(key, str) else key.decode())

    if not keys:
        return {"data": [], "meta": {"page": page, "per_page": per_page, "total": 0, "total_pages": 0}}

    # Step 2: Pipeline all HGETALL calls (single round-trip)
    pipe = redis.pipeline()
    for key in keys:
        pipe.hgetall(key)
    all_data = await pipe.execute()

    # Step 3: Collect raw entries, filtering by category
    raw_entries: list[tuple[str, str, dict]] = []  # (redis_key, title, data)
    title_categories: dict[str, str] = {}
    title_platforms: dict[str, str] = {}  # {title: platform_slug} for first occurrence

    for key, data in zip(keys, all_data):
        if not data:
            continue
        title = data.get("market_title", "")
        if not title:
            continue
        mkt_category = data.get("category", "")
        if category and mkt_category.lower() != category.lower():
            continue
        raw_entries.append((key, title, data))
        if title not in title_categories:
            title_categories[title] = mkt_category
            title_platforms[title] = data.get("platform", "")

    if not raw_entries:
        return {"data": [], "meta": {"page": page, "per_page": per_page, "total": 0, "total_pages": 0}}

    # Step 4: Build or load canonical title map (platform-aware fuzzy clustering)
    all_titles = list(title_categories.keys())
    canonical_map = await _get_or_build_canonical_map(
        redis, all_titles, title_categories, title_platforms
    )

    # Step 5: Group by canonical title
    markets: dict[str, dict] = {}
    for key, title, data in raw_entries:
        canonical = canonical_map.get(title, title)

        parts = key.split(":", 3)
        market_id = parts[3] if len(parts) > 3 else ""
        platform_url = data.get("market_url", "")
        mkt_category = data.get("category", "")

        if canonical not in markets:
            markets[canonical] = {
                "market_id": market_id,
                "market_title": canonical,
                "category": mkt_category,
                "market_url": platform_url,
                "platforms": [],
            }
        elif not markets[canonical]["market_url"] and platform_url:
            markets[canonical]["market_url"] = platform_url

        platform = data.get("platform", "unknown")
        outcomes = []
        i = 0
        while f"outcome_{i}_name" in data:
            outcomes.append({
                "outcome_index": i,
                "outcome_name": data.get(f"outcome_{i}_name", ""),
                "price": float(data.get(f"outcome_{i}_price", 0)),
                "implied_prob": float(data.get(f"outcome_{i}_implied", 0)),
                "outcome_type": data.get(f"outcome_{i}_type", "binary"),
            })
            i += 1

        entry = {
            "platform_slug": platform,
            "market_title": title,  # original per-platform title for reference
            "outcomes": outcomes,
            "market_url": platform_url,
            "volume_24h": float(data["volume_24h"]) if data.get("volume_24h") else None,
            "liquidity_usd": float(data["liquidity_usd"]) if data.get("liquidity_usd") else None,
            "updated_at": data.get("updated_at"),
        }

        # Deduplicate: if this platform already has an entry in the group,
        # keep the one with the most recent updated_at (same market listed
        # in multiple Kalshi events, for example).
        existing_idx = None
        for idx, existing in enumerate(markets[canonical]["platforms"]):
            if existing["platform_slug"] == platform:
                existing_idx = idx
                break
        if existing_idx is not None:
            old_ts = markets[canonical]["platforms"][existing_idx].get("updated_at", "")
            new_ts = entry.get("updated_at", "")
            if new_ts > old_ts:
                markets[canonical]["platforms"][existing_idx] = entry
        else:
            markets[canonical]["platforms"].append(entry)

    # Sort: multi-platform markets first, then by number of platforms desc
    all_markets = sorted(markets.values(), key=lambda m: len(m["platforms"]), reverse=True)

    # Cache the full sorted list for 30s
    try:
        await redis.set(cache_key, orjson.dumps(all_markets), ex=_RESPONSE_CACHE_TTL)
    except Exception:
        pass

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
