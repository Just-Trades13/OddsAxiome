"""Publish normalized odds to Redis — both live cache and stream for arb engine."""
import re

import orjson
import structlog

from src.workers.base import NormalizedOdds

logger = structlog.get_logger()

LIVE_CACHE_TTL = 660  # 11 minutes — must exceed slowest worker poll (TheOddsAPI 5 min)
STREAM_KEY = "odds:normalized"
STREAM_MAXLEN = 50000  # Cap stream length to prevent unbounded growth

# Regex to detect Kalshi market-level ticker URLs (with date/outcome suffixes)
# Valid series_ticker URLs: /markets/kxfed, /markets/kxnba
# Invalid market ticker URLs: /markets/KXFED-26DEC-T4.25, /markets/KXNBA-26-OKC
_KALSHI_MARKET_TICKER_RE = re.compile(
    r"^https://kalshi\.com/markets/(KX[A-Z0-9]+-\d)", re.IGNORECASE
)


def _fix_kalshi_url(url: str) -> str:
    """Ensure Kalshi URLs use the lowercase series_ticker (no date/outcome suffixes).

    Kalshi's website only resolves series-level URLs like /markets/kxfed.
    Market-level tickers like KXFED-26DEC-T4.25 return 404.
    """
    if not url or "kalshi.com/markets/" not in url:
        return url

    # Extract the path after /markets/
    path = url.split("kalshi.com/markets/", 1)[1]

    # If it's already lowercase with no dashes-after-letters, it's a valid series ticker
    if path == path.lower() and not re.search(r"[a-z]-\d", path):
        return url

    # Extract series ticker: everything before the first dash-digit pattern
    # KXFED-26DEC-T4.25 → KXFED
    # KXNBA-26-OKC → KXNBA
    # KXPRESPERSON-28-DTRU → KXPRESPERSON
    match = re.match(r"^([A-Za-z]+?)(?:-\d)", path)
    if match:
        series = match.group(1).lower()
        return f"https://kalshi.com/markets/{series}"

    # Fallback: just lowercase the whole thing
    return url.lower()


async def publish_odds(redis, odds: list[NormalizedOdds]) -> None:
    """Write normalized odds to Redis live cache + stream."""
    if not odds:
        return

    pipe = redis.pipeline()

    for o in odds:
        # Fix Kalshi URLs to use series_ticker format
        market_url = o.market_url or ""
        if o.platform_slug == "kalshi" and market_url:
            market_url = _fix_kalshi_url(market_url)

        # 1) Update live cache hash: odds:live:{platform}:{market_id}
        cache_key = f"odds:live:{o.platform_slug}:{o.external_market_id}"
        pipe.hset(
            cache_key,
            mapping={
                f"outcome_{o.outcome_index}_name": o.outcome_name,
                f"outcome_{o.outcome_index}_price": str(o.price),
                f"outcome_{o.outcome_index}_implied": str(o.implied_prob),
                f"outcome_{o.outcome_index}_bid": str(o.bid or ""),
                f"outcome_{o.outcome_index}_ask": str(o.ask or ""),
                f"outcome_{o.outcome_index}_type": o.outcome_type,
                "volume_24h": str(o.volume_24h or ""),
                "volume_usd": str(o.volume_usd or ""),
                "liquidity_usd": str(o.liquidity_usd or ""),
                "market_title": o.market_title,
                "category": o.category,
                "platform": o.platform_slug,
                "market_url": market_url,
                "updated_at": o.captured_at.isoformat(),
            },
        )
        pipe.expire(cache_key, LIVE_CACHE_TTL)

        # 2) Push to Redis Stream for arb engine consumption
        stream_data = {
            "platform": o.platform_slug,
            "market_id": o.external_market_id,
            "market_title": o.market_title,
            "category": o.category,
            "outcome_index": str(o.outcome_index),
            "outcome_name": o.outcome_name,
            "outcome_type": o.outcome_type,
            "price": str(o.price),
            "implied_prob": str(o.implied_prob),
            "captured_at": o.captured_at.isoformat(),
        }
        pipe.xadd(STREAM_KEY, stream_data, maxlen=STREAM_MAXLEN, approximate=True)

    await pipe.execute()

    # 3) Publish update notification for WebSocket clients
    update_msg = orjson.dumps({
        "type": "odds_batch",
        "platform": odds[0].platform_slug,
        "count": len(odds),
    }).decode()
    await redis.publish("odds:updates", update_msg)
