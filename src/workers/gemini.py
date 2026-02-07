"""Gemini prediction markets worker."""
import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

GEMINI_API_BASE = "https://api.gemini.com/v1/prediction-markets"


class GeminiWorker(BaseIngestionWorker):
    platform_slug = "gemini"
    poll_interval = 30.0

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None
        self.api_key = config.gemini_api_key

    async def connect(self) -> None:
        headers = {}
        if self.api_key:
            headers["X-GEMINI-APIKEY"] = self.api_key
        self.client = httpx.AsyncClient(
            headers=headers,
            timeout=30,
        )
        self.logger.info("Connected to Gemini Prediction Markets API")

    async def fetch_markets(self) -> list[RawOddsData]:
        if not self.client:
            return []

        results: list[RawOddsData] = []

        try:
            # Fetch available events/markets
            resp = await self.client.get(f"{GEMINI_API_BASE}/events")

            if resp.status_code == 404:
                self.logger.debug("Gemini prediction markets endpoint not available yet")
                return []

            resp.raise_for_status()
            events = resp.json()

            for event in events if isinstance(events, list) else []:
                event_id = str(event.get("id", ""))
                title = event.get("title", event.get("name", ""))
                category = _classify(title)

                markets = event.get("markets", event.get("contracts", []))
                outcomes_json = [
                    {"name": m.get("name", m.get("outcome", "")), "index": i}
                    for i, m in enumerate(markets)
                ]

                for i, market in enumerate(markets):
                    name = market.get("name", market.get("outcome", f"Option {i}"))
                    price = market.get("price", market.get("last_price"))

                    if price is None:
                        continue

                    results.append(
                        RawOddsData(
                            external_market_id=event_id,
                            market_title=title,
                            category=category,
                            platform_slug=self.platform_slug,
                            outcome_index=i,
                            outcome_name=name,
                            price=float(price),
                            price_format="probability",
                            volume_usd=_safe_float(market.get("volume")),
                            market_url=f"https://www.gemini.com/prediction-markets/{event_id}",
                            outcomes_json=outcomes_json,
                        )
                    )

        except httpx.HTTPError as e:
            self.logger.error("Gemini API error", error=str(e))
        except Exception as e:
            self.logger.error("Gemini parse error", error=str(e), exc_info=True)

        return results

    def stop(self) -> None:
        super().stop()
        self.client = None


def _classify(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["bitcoin", "crypto", "ethereum", "btc", "eth"]):
        return "crypto"
    if any(k in t for k in ["election", "president", "congress", "trump", "politics"]):
        return "politics"
    if any(k in t for k in ["economy", "fed", "inflation", "gdp", "rates"]):
        return "economics"
    if any(k in t for k in ["nfl", "nba", "sports", "mlb", "soccer"]):
        return "sports"
    if any(k in t for k in ["climate", "science", "ai", "temperature"]):
        return "science"
    return "culture"


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
