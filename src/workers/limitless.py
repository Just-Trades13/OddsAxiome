"""Limitless Exchange prediction markets worker."""
import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

LIMITLESS_API_BASE = "https://api.limitless.exchange/api-v1"


class LimitlessWorker(BaseIngestionWorker):
    platform_slug = "limitless"
    poll_interval = 30.0

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None

    async def connect(self) -> None:
        self.client = httpx.AsyncClient(
            timeout=30,
            headers={"Accept": "application/json"},
        )
        self.logger.info("Connected to Limitless Exchange API")

    async def fetch_markets(self) -> list[RawOddsData]:
        if not self.client:
            return []

        results: list[RawOddsData] = []

        try:
            resp = await self.client.get(f"{LIMITLESS_API_BASE}/markets", params={"status": "active"})

            if resp.status_code == 404:
                self.logger.debug("Limitless API markets endpoint returned 404")
                return []

            resp.raise_for_status()
            markets = resp.json()

            if not isinstance(markets, list):
                markets = markets.get("markets", markets.get("data", []))

            for market in markets:
                market_id = str(market.get("id", market.get("address", "")))
                title = market.get("title", market.get("question", ""))
                category = _classify(title)

                outcomes = market.get("outcomes", [])
                if not outcomes:
                    # Binary market fallback
                    yes_price = market.get("yes_price", market.get("lastYesPrice"))
                    no_price = market.get("no_price", market.get("lastNoPrice"))
                    if yes_price is not None:
                        outcomes = [
                            {"name": "Yes", "price": yes_price},
                            {"name": "No", "price": no_price or (1.0 - float(yes_price))},
                        ]

                outcomes_json = [
                    {"name": o.get("name", f"Option {i}"), "index": i}
                    for i, o in enumerate(outcomes)
                ]

                for i, outcome in enumerate(outcomes):
                    name = outcome.get("name", outcome.get("title", f"Option {i}"))
                    price = outcome.get("price", outcome.get("lastPrice"))

                    if price is None:
                        continue

                    results.append(
                        RawOddsData(
                            external_market_id=market_id,
                            market_title=title,
                            category=category,
                            platform_slug=self.platform_slug,
                            outcome_index=i,
                            outcome_name=name,
                            price=float(price),
                            price_format="probability",
                            volume_usd=_safe_float(market.get("volume", market.get("volumeUsd"))),
                            liquidity_usd=_safe_float(market.get("liquidity")),
                            market_url=f"https://limitless.exchange/markets/{market_id}",
                            market_description=market.get("description"),
                            outcomes_json=outcomes_json,
                        )
                    )

        except httpx.HTTPError as e:
            self.logger.error("Limitless API error", error=str(e))
        except Exception as e:
            self.logger.error("Limitless parse error", error=str(e), exc_info=True)

        return results

    def stop(self) -> None:
        super().stop()
        self.client = None


def _classify(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["bitcoin", "crypto", "ethereum", "btc", "eth", "solana"]):
        return "crypto"
    if any(k in t for k in ["election", "president", "politics", "trump", "congress"]):
        return "politics"
    if any(k in t for k in ["economy", "fed", "inflation", "gdp"]):
        return "economics"
    if any(k in t for k in ["nfl", "nba", "sports"]):
        return "sports"
    if any(k in t for k in ["climate", "science", "ai"]):
        return "science"
    return "culture"


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
