"""Kalshi ingestion worker — REST API with official SDK."""
import asyncio

import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2"

CATEGORY_MAP = {
    "politics": "politics",
    "election": "politics",
    "president": "politics",
    "congress": "politics",
    "trump": "politics",
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


def classify_category(title: str, series_ticker: str = "") -> str:
    search = (title + " " + series_ticker).lower()
    for keyword, category in CATEGORY_MAP.items():
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
        """Fetch active events and markets from Kalshi."""
        if not self.client:
            return []

        results: list[RawOddsData] = []

        try:
            # Fetch active events
            cursor = None
            pages = 0
            max_pages = 5
            while pages < max_pages:
                params = {"status": "open", "limit": 100}
                if cursor:
                    params["cursor"] = cursor

                self.logger.info("Kalshi fetching events page", page=pages + 1)
                resp = await self.client.get("/events", params=params)
                resp.raise_for_status()
                data = resp.json()

                events = data.get("events", [])
                for event in events:
                    event_ticker = event.get("event_ticker", "")
                    event_title = event.get("title", "")
                    category_str = event.get("category", "")
                    category = classify_category(event_title, category_str)

                    markets = event.get("markets", [])
                    if not markets:
                        continue  # Skip events without inline markets

                    for market in markets:
                        ticker = market.get("ticker", "")
                        title = market.get("title") or market.get("subtitle") or event_title
                        yes_price = market.get("yes_ask") or market.get("last_price")
                        no_price = market.get("no_ask")
                        volume = market.get("volume")

                        if yes_price is None:
                            continue

                        outcomes_json = [
                            {"name": "Yes", "index": 0},
                            {"name": "No", "index": 1},
                        ]

                        # Yes outcome
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

                        # No outcome
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
                if not cursor or not events:
                    break
                await asyncio.sleep(0.5)  # Rate limit: avoid 429s on pagination

        except httpx.HTTPError as e:
            self.logger.error("Kalshi API error", error=str(e))
        except Exception as e:
            self.logger.error("Kalshi parse error", error=str(e), exc_info=True)

        return results

    async def _fetch_event_markets(self, event_ticker: str) -> list[dict]:
        """Fetch markets for a specific event."""
        if not self.client:
            return []
        try:
            resp = await self.client.get(
                "/markets", params={"event_ticker": event_ticker, "limit": 100}
            )
            resp.raise_for_status()
            return resp.json().get("markets", [])
        except Exception:
            return []

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
