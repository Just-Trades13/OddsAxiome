"""Robinhood prediction markets worker — EXPERIMENTAL.
Robinhood has no official public API for prediction markets.
This worker attempts known endpoints but may break at any time.
Built with graceful degradation — if it fails, the platform continues without Robinhood data.
"""
import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

# Known unofficial endpoint (may change without notice)
RH_PREDICTION_BASE = "https://bonfire-api.robinhood.com/prediction_markets"


class RobinhoodWorker(BaseIngestionWorker):
    platform_slug = "robinhood"
    poll_interval = 120.0  # Conservative polling to avoid bans

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None
        self._consecutive_failures = 0
        self._max_failures = 5  # Disable after 5 consecutive failures

    async def connect(self) -> None:
        self.client = httpx.AsyncClient(
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                "Accept": "application/json",
            },
            timeout=15,
            follow_redirects=True,
        )
        self.logger.info("Robinhood worker initialized (EXPERIMENTAL)")

    async def fetch_markets(self) -> list[RawOddsData]:
        if not self.client:
            return []

        if self._consecutive_failures >= self._max_failures:
            self.logger.warning(
                "Robinhood worker disabled after consecutive failures",
                failures=self._consecutive_failures,
            )
            return []

        results: list[RawOddsData] = []

        try:
            resp = await self.client.get(f"{RH_PREDICTION_BASE}/events/")

            if resp.status_code in (403, 401, 404):
                self._consecutive_failures += 1
                self.logger.warning(
                    "Robinhood API not accessible",
                    status=resp.status_code,
                    failures=self._consecutive_failures,
                )
                return []

            resp.raise_for_status()
            data = resp.json()
            self._consecutive_failures = 0  # Reset on success

            events = data.get("results", data.get("events", []))
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
                    price = (
                        contract.get("price")
                        or contract.get("yes_price")
                        or contract.get("last_trade_price")
                    )
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
                            market_url=f"https://robinhood.com/prediction-markets/{event_id}",
                            outcomes_json=outcomes_json,
                        )
                    )

        except httpx.HTTPError as e:
            self._consecutive_failures += 1
            self.logger.warning("Robinhood API error (experimental)", error=str(e))
        except Exception as e:
            self._consecutive_failures += 1
            self.logger.error("Robinhood parse error", error=str(e))

        return results

    def stop(self) -> None:
        super().stop()
        self.client = None


def _classify(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["election", "president", "politics", "trump"]):
        return "politics"
    if any(k in t for k in ["bitcoin", "crypto"]):
        return "crypto"
    if any(k in t for k in ["economy", "fed", "inflation"]):
        return "economics"
    if any(k in t for k in ["nfl", "nba", "sports", "super bowl"]):
        return "sports"
    if any(k in t for k in ["climate", "science"]):
        return "science"
    return "culture"
