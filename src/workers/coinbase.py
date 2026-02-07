"""Coinbase prediction markets worker.
Note: Coinbase prediction markets operate through a Kalshi partnership.
This worker attempts the Coinbase API first, then falls back to marking
Kalshi markets as available on Coinbase.
"""
import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()


class CoinbaseWorker(BaseIngestionWorker):
    platform_slug = "coinbase"
    poll_interval = 60.0

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None
        self.api_key = config.coinbase_api_key

    async def connect(self) -> None:
        headers = {}
        if self.api_key:
            headers["CB-ACCESS-KEY"] = self.api_key
        self.client = httpx.AsyncClient(headers=headers, timeout=30)
        self.logger.info("Connected to Coinbase API")

    async def fetch_markets(self) -> list[RawOddsData]:
        """
        Attempt to fetch prediction market data from Coinbase.
        As of the current implementation, Coinbase's prediction market
        data flows through Kalshi. If no direct endpoint exists,
        this worker returns empty and logs accordingly.
        """
        if not self.client:
            return []

        results: list[RawOddsData] = []

        try:
            # Try Coinbase prediction markets endpoint
            resp = await self.client.get(
                "https://api.coinbase.com/api/v3/brokerage/prediction-markets/events"
            )

            if resp.status_code == 404:
                self.logger.debug(
                    "Coinbase prediction markets endpoint not available — "
                    "data may flow through Kalshi partnership"
                )
                return []

            if resp.status_code == 401:
                self.logger.warning("Coinbase API: authentication required")
                return []

            resp.raise_for_status()
            data = resp.json()

            events = data.get("events", data.get("data", []))
            for event in events if isinstance(events, list) else []:
                event_id = str(event.get("id", ""))
                title = event.get("title", event.get("name", ""))
                category = _classify(title)

                contracts = event.get("contracts", event.get("markets", []))
                outcomes_json = [
                    {"name": c.get("name", ""), "index": i}
                    for i, c in enumerate(contracts)
                ]

                for i, contract in enumerate(contracts):
                    name = contract.get("name", f"Option {i}")
                    price = contract.get("price", contract.get("yes_price"))
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
                            volume_usd=_safe_float(contract.get("volume")),
                            market_url=f"https://www.coinbase.com/prediction-markets/{event_id}",
                            outcomes_json=outcomes_json,
                        )
                    )

        except httpx.HTTPError as e:
            self.logger.error("Coinbase API error", error=str(e))
        except Exception as e:
            self.logger.error("Coinbase parse error", error=str(e), exc_info=True)

        return results

    def stop(self) -> None:
        super().stop()
        self.client = None


def _classify(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["bitcoin", "crypto", "ethereum", "btc"]):
        return "crypto"
    if any(k in t for k in ["election", "president", "politics"]):
        return "politics"
    if any(k in t for k in ["economy", "fed", "inflation"]):
        return "economics"
    if any(k in t for k in ["nfl", "nba", "sports"]):
        return "sports"
    return "culture"


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
