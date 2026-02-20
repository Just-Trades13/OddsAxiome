"""Gemini Predictions worker — public markets endpoint, no auth required for reads.

Gemini Predictions (powered by Gemini Titan DCM license) offers event contracts
on politics, economics, crypto, and more. The /v1/prediction-markets/events
endpoint is public and returns paginated events with nested contracts.

Response shape (verified 2026-02-20):
{
  "data": [{
    "id": "884",
    "title": "...",
    "slug": "...",
    "type": "categorical",
    "category": "Sports",
    "ticker": "MIHGOLD26",
    "status": "active",
    "volume": "104070",
    "volume24h": "15999",
    "liquidity": null,
    "contracts": [{
      "id": "884-4408",
      "label": "Canada",
      "prices": {
        "buy": {"yes": "0.57", "no": "0.47"},
        "sell": {"yes": "0.53", "no": "0.43"},
        "bestBid": "0.53",
        "bestAsk": "0.57",
        "lastTradePrice": "0.57"
      },
      "ticker": "CAN",
      "instrumentSymbol": "GEMI-MIHGOLD26-CAN",
      "status": "active"
    }],
    "expiryDate": "2026-02-22T16:40:00.000Z"
  }],
  "pagination": {"limit": 2, "offset": 0, "total": 1000}
}
"""
import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

GEMINI_API_BASE = "https://api.gemini.com/v1/prediction-markets"

# Gemini category string → OddsAxiom category
GEMINI_CATEGORY_MAP = {
    "politics": "politics",
    "elections": "politics",
    "economics": "economics",
    "economy": "economics",
    "financial": "economics",
    "crypto": "crypto",
    "sports": "sports",
    "entertainment": "culture",
    "fun/culture": "culture",
    "media": "culture",
    "science": "science",
    "technology": "science",
    "climate": "science",
    "weather": "science",
}


def _classify(gemini_category: str, title: str) -> str:
    """Map Gemini category to OddsAxiom category, with keyword fallback."""
    if gemini_category:
        mapped = GEMINI_CATEGORY_MAP.get(gemini_category.lower())
        if mapped:
            return mapped

    t = title.lower()
    if any(k in t for k in ("bitcoin", "crypto", "ethereum", "btc", "eth")):
        return "crypto"
    if any(k in t for k in ("election", "president", "congress", "trump", "politics")):
        return "politics"
    if any(k in t for k in ("economy", "fed", "inflation", "gdp", "rates", "cpi", "jobs")):
        return "economics"
    if any(k in t for k in ("nfl", "nba", "sports", "mlb", "soccer", "nhl")):
        return "sports"
    if any(k in t for k in ("climate", "science", "ai", "temperature", "weather")):
        return "science"
    return "politics"


class GeminiWorker(BaseIngestionWorker):
    platform_slug = "gemini"
    poll_interval = 30.0

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None

    async def connect(self) -> None:
        self.client = httpx.AsyncClient(timeout=30)
        self.logger.info("Connected to Gemini Predictions API")

    async def fetch_markets(self) -> list[RawOddsData]:
        if not self.client:
            return []

        results: list[RawOddsData] = []
        offset = 0
        limit = 100
        max_pages = 10

        try:
            for _ in range(max_pages):
                resp = await self.client.get(
                    f"{GEMINI_API_BASE}/events",
                    params={
                        "status[]": "active",
                        "limit": limit,
                        "offset": offset,
                    },
                )

                if resp.status_code == 404:
                    self.logger.debug("Gemini prediction markets endpoint not available")
                    return []
                if resp.status_code == 429:
                    self.logger.warning("Gemini: rate limited, using partial results")
                    break

                resp.raise_for_status()
                body = resp.json()

                events = body.get("data", [])
                if not events:
                    break

                for event in events:
                    event_id = event.get("id", "")
                    title = event.get("title", "")
                    slug = event.get("slug", "")
                    gemini_category = event.get("category", "")
                    category = _classify(gemini_category, title)
                    contracts = event.get("contracts", [])

                    if not contracts or not title:
                        continue

                    outcomes_json = [
                        {"name": c.get("label", f"Option {i}"), "index": i}
                        for i, c in enumerate(contracts)
                    ]

                    for i, contract in enumerate(contracts):
                        label = contract.get("label", f"Option {i}")

                        # Gemini nests pricing under "prices" object, not a flat "price" field.
                        # Use lastTradePrice as the canonical price; fall back to bestAsk, then buy.yes.
                        prices_obj = contract.get("prices") or {}
                        price_str = (
                            prices_obj.get("lastTradePrice")
                            or prices_obj.get("bestAsk")
                            or (prices_obj.get("buy", {}) or {}).get("yes")
                        )

                        if price_str is None:
                            continue

                        try:
                            price = float(price_str)
                        except (ValueError, TypeError):
                            continue

                        if price <= 0:
                            continue

                        # Gemini prices are 0.00-1.00 (probability/cents)
                        market_url = f"https://www.gemini.com/predictions/{slug}" if slug else None

                        results.append(
                            RawOddsData(
                                external_market_id=event.get("ticker", event_id),
                                market_title=title,
                                category=category,
                                platform_slug=self.platform_slug,
                                outcome_index=i,
                                outcome_name=label,
                                price=price,
                                price_format="probability",
                                volume_usd=_safe_float(event.get("volume") or event.get("volume24h")),
                                market_url=market_url,
                                outcomes_json=outcomes_json,
                            )
                        )

                # Check pagination
                pagination = body.get("pagination", {})
                total = pagination.get("total", 0)
                offset += limit
                if offset >= total:
                    break

        except httpx.HTTPError as e:
            self.logger.error("Gemini API error", error=str(e))
        except Exception as e:
            self.logger.error("Gemini parse error", error=str(e), exc_info=True)

        self.logger.info("Gemini fetch complete", events=len(results) // 2, outcomes=len(results))
        return results

    def stop(self) -> None:
        super().stop()
        self.client = None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
