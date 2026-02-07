"""PredictIt ingestion worker — simple REST polling every 60s."""
import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

PREDICTIT_API_URL = "https://www.predictit.org/api/marketdata/all/"

CATEGORY_MAP = {
    "politics": "politics",
    "president": "politics",
    "congress": "politics",
    "senate": "politics",
    "house": "politics",
    "election": "politics",
    "trump": "politics",
    "democrat": "politics",
    "republican": "politics",
    "governor": "politics",
    "economy": "economics",
    "fed": "economics",
    "inflation": "economics",
    "bitcoin": "crypto",
    "crypto": "crypto",
    "world": "politics",
    "science": "science",
    "climate": "science",
}


def classify_category(name: str) -> str:
    name_lower = name.lower()
    for keyword, category in CATEGORY_MAP.items():
        if keyword in name_lower:
            return category
    return "politics"


class PredictItWorker(BaseIngestionWorker):
    platform_slug = "predictit"
    poll_interval = 60.0  # PredictIt updates roughly every 60s

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None

    async def connect(self) -> None:
        self.client = httpx.AsyncClient(timeout=30)
        self.logger.info("Connected to PredictIt API")

    async def fetch_markets(self) -> list[RawOddsData]:
        """Fetch all active markets from PredictIt public API."""
        if not self.client:
            return []

        results: list[RawOddsData] = []

        try:
            resp = await self.client.get(PREDICTIT_API_URL)
            resp.raise_for_status()
            data = resp.json()

            for market in data.get("markets", []):
                market_id = str(market.get("id", ""))
                market_name = market.get("name", "")
                market_url = market.get("url", "")
                category = classify_category(market_name)
                status = market.get("status", "")

                if status != "Open":
                    continue

                contracts = market.get("contracts", [])
                outcomes_json = [
                    {"name": c.get("name", ""), "index": i}
                    for i, c in enumerate(contracts)
                ]

                for i, contract in enumerate(contracts):
                    name = contract.get("name", contract.get("shortName", f"Option {i}"))
                    last_trade = contract.get("lastTradePrice")
                    best_buy_yes = contract.get("bestBuyYesCost")
                    best_buy_no = contract.get("bestBuyNoCost")

                    if last_trade is None:
                        continue

                    results.append(
                        RawOddsData(
                            external_market_id=market_id,
                            market_title=market_name,
                            category=category,
                            platform_slug=self.platform_slug,
                            outcome_index=i,
                            outcome_name=name,
                            price=float(last_trade),
                            price_format="probability",
                            bid=float(best_buy_yes) if best_buy_yes else None,
                            ask=float(best_buy_no) if best_buy_no else None,
                            volume_24h=None,  # PredictIt doesn't provide this
                            market_url=market_url,
                            outcomes_json=outcomes_json,
                        )
                    )

        except httpx.HTTPError as e:
            self.logger.error("PredictIt API error", error=str(e))
        except Exception as e:
            self.logger.error("PredictIt parse error", error=str(e), exc_info=True)

        return results

    def stop(self) -> None:
        super().stop()
        if self.client:
            self.client = None
