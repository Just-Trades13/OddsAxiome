"""Kalshi ingestion worker — REST API with official SDK."""
import asyncio

import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2"

# Kalshi's own category field → OddsAxiom category
KALSHI_CATEGORY_MAP = {
    "politics": "politics",
    "elections": "politics",
    "economics": "economics",
    "financials": "economics",
    "crypto": "crypto",
    "sports": "sports",
    "entertainment": "culture",
    "social": "culture",
    "science and technology": "science",
    "climate and weather": "science",
    "health": "science",
    "world": "politics",
    "companies": "economics",
    "mentions": "culture",
    "transportation": "science",
}

# Fallback keyword matching for markets with no Kalshi category
KEYWORD_MAP = {
    "politics": "politics",
    "election": "politics",
    "president": "politics",
    "congress": "politics",
    "trump": "politics",
    "senate": "politics",
    "house": "politics",
    "governor": "politics",
    "economy": "economics",
    "fed": "economics",
    "inflation": "economics",
    "gdp": "economics",
    "rates": "economics",
    "cpi": "economics",
    "jobs": "economics",
    "unemployment": "economics",
    "crypto": "crypto",
    "bitcoin": "crypto",
    "ethereum": "crypto",
    "sports": "sports",
    "nfl": "sports",
    "nba": "sports",
    "super bowl": "sports",
    "climate": "science",
    "weather": "science",
    "temperature": "science",
    "ai": "science",
    "tech": "science",
    "oscars": "culture",
    "entertainment": "culture",
    "culture": "culture",
}

# Skip multi-game parlay tickers — they're unique to Kalshi and won't match
# cross-platform. There are 3000+ of them and they flood out real markets.
_SKIP_PREFIXES = ("KXMVESPORTSMULTIGAMEEXTENDED",)


def classify_category(title: str, series_ticker: str = "", kalshi_cat: str = "") -> str:
    """Map a Kalshi market to an OddsAxiom category.

    Uses Kalshi's own category field first, then falls back to keyword matching.
    """
    # 1. Use Kalshi's native category if available
    if kalshi_cat:
        mapped = KALSHI_CATEGORY_MAP.get(kalshi_cat.lower())
        if mapped:
            return mapped

    # 2. Keyword fallback
    search = (title + " " + series_ticker).lower()
    for keyword, category in KEYWORD_MAP.items():
        if keyword in search:
            return category
    return "politics"


class KalshiWorker(BaseIngestionWorker):
    platform_slug = "kalshi"
    poll_interval = 30.0

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None
        self.api_key = config.kalshi_api_key

    async def connect(self) -> None:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        self.client = httpx.AsyncClient(
            base_url=KALSHI_API_BASE,
            headers=headers,
            timeout=30,
        )
        self.logger.info("Connected to Kalshi API", authenticated=bool(self.api_key))

    async def fetch_markets(self) -> list[RawOddsData]:
        """Fetch active markets from Kalshi /markets endpoint.

        Kalshi uses 'active' status for political/elections markets and
        'open' for sports parlays. We fetch both to get full coverage.
        """
        if not self.client:
            return []

        results: list[RawOddsData] = []

        # Fetch both statuses — 'active' has politics/economics, 'open' has sports
        for status in ("active", "open"):
            try:
                cursor = None
                pages = 0
                max_pages = 10  # Up to 2000 per status
                while pages < max_pages:
                    params = {"status": status, "limit": 200}
                    if cursor:
                        params["cursor"] = cursor

                    resp = await self.client.get("/markets", params=params)
                    resp.raise_for_status()
                    data = resp.json()

                    markets = data.get("markets", [])
                    self.logger.info(
                        "Kalshi fetched markets page",
                        status=status,
                        page=pages + 1,
                        count=len(markets),
                    )

                    for market in markets:
                        ticker = market.get("ticker", "")
                        event_ticker = market.get("event_ticker", "")

                        # Skip multi-game parlays — they won't match cross-platform
                        if any(event_ticker.startswith(p) for p in _SKIP_PREFIXES):
                            continue

                        title = market.get("title") or market.get("subtitle", "")
                        kalshi_cat = market.get("category", "")
                        category = classify_category(title, event_ticker, kalshi_cat)
                        yes_price = market.get("yes_ask") or market.get("last_price")
                        no_price = market.get("no_ask")
                        volume = market.get("volume")

                        if yes_price is None:
                            continue

                        outcomes_json = [
                            {"name": "Yes", "index": 0},
                            {"name": "No", "index": 1},
                        ]

                        results.append(
                            RawOddsData(
                                external_market_id=ticker,
                                market_title=title,
                                category=category,
                                platform_slug=self.platform_slug,
                                outcome_index=0,
                                outcome_name="Yes",
                                price=float(yes_price),
                                price_format="cents",
                                bid=_safe_float(market.get("yes_bid")),
                                ask=_safe_float(market.get("yes_ask")),
                                volume_24h=_safe_float(volume),
                                market_url=f"https://kalshi.com/markets/{ticker}",
                                outcomes_json=outcomes_json,
                            )
                        )

                        if no_price is not None:
                            results.append(
                                RawOddsData(
                                    external_market_id=ticker,
                                    market_title=title,
                                    category=category,
                                    platform_slug=self.platform_slug,
                                    outcome_index=1,
                                    outcome_name="No",
                                    price=float(no_price),
                                    price_format="cents",
                                    bid=_safe_float(market.get("no_bid")),
                                    ask=_safe_float(market.get("no_ask")),
                                    volume_24h=_safe_float(volume),
                                    market_url=f"https://kalshi.com/markets/{ticker}",
                                    outcomes_json=outcomes_json,
                                )
                            )

                    cursor = data.get("cursor")
                    pages += 1
                    if not cursor or not markets:
                        break
                    await asyncio.sleep(0.5)

            except httpx.HTTPError as e:
                self.logger.error("Kalshi API error", status=status, error=str(e))
            except Exception as e:
                self.logger.error("Kalshi parse error", status=status, error=str(e), exc_info=True)

        self.logger.info("Kalshi total non-parlay markets", count=len(results) // 2)
        return results

    def stop(self) -> None:
        super().stop()
        if self.client:
            self.client = None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
