"""Polymarket ingestion worker — Gamma API for market discovery, CLOB for prices."""
import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

GAMMA_API_BASE = "https://gamma-api.polymarket.com"

# Category mapping based on Polymarket tags
CATEGORY_MAP = {
    "politics": "politics",
    "election": "politics",
    "trump": "politics",
    "biden": "politics",
    "congress": "politics",
    "senate": "politics",
    "crypto": "crypto",
    "bitcoin": "crypto",
    "ethereum": "crypto",
    "sports": "sports",
    "nfl": "sports",
    "nba": "sports",
    "mlb": "sports",
    "soccer": "sports",
    "science": "science",
    "climate": "science",
    "ai": "science",
    "economy": "economics",
    "fed": "economics",
    "inflation": "economics",
    "gdp": "economics",
    "recession": "economics",
    "entertainment": "culture",
    "oscars": "culture",
    "culture": "culture",
}


def classify_category(title: str, tags: list | None = None) -> str:
    """Classify a market into one of the 6 OddsAxiom categories."""
    search_text = title.lower()
    if tags:
        tag_strings = []
        for t in tags:
            if isinstance(t, str):
                tag_strings.append(t.lower())
            elif isinstance(t, dict):
                tag_strings.append(str(t.get("label", t.get("name", ""))).lower())
        search_text += " " + " ".join(tag_strings)

    for keyword, category in CATEGORY_MAP.items():
        if keyword in search_text:
            return category
    return "politics"  # Default


class PolymarketWorker(BaseIngestionWorker):
    platform_slug = "polymarket"
    poll_interval = 30.0  # REST polling for market data

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None

    async def connect(self) -> None:
        self.client = httpx.AsyncClient(timeout=30)
        self.logger.info("Connected to Polymarket Gamma API")

    async def fetch_markets(self) -> list[RawOddsData]:
        """Fetch active events and their markets from Gamma API."""
        if not self.client:
            return []

        results: list[RawOddsData] = []

        try:
            # Fetch active events with their markets
            resp = await self.client.get(
                f"{GAMMA_API_BASE}/events",
                params={"active": "true", "closed": "false", "limit": 100},
            )
            resp.raise_for_status()
            events = resp.json()

            for event in events:
                markets = event.get("markets", [])
                event_title = event.get("title", "")
                tags = event.get("tags", [])
                category = classify_category(event_title, tags)

                for market in markets:
                    market_id = market.get("conditionId") or market.get("id", "")
                    question = market.get("question", event_title)
                    outcome_prices = market.get("outcomePrices", "")
                    outcomes = market.get("outcomes", "")

                    # Parse outcomes and prices
                    if isinstance(outcome_prices, str) and outcome_prices:
                        try:
                            import json
                            prices = json.loads(outcome_prices)
                        except (json.JSONDecodeError, ValueError):
                            continue
                    elif isinstance(outcome_prices, list):
                        prices = outcome_prices
                    else:
                        continue

                    if isinstance(outcomes, str) and outcomes:
                        try:
                            import json
                            outcome_names = json.loads(outcomes)
                        except (json.JSONDecodeError, ValueError):
                            outcome_names = ["Yes", "No"]
                    elif isinstance(outcomes, list):
                        outcome_names = outcomes
                    else:
                        outcome_names = ["Yes", "No"]

                    outcomes_json = [
                        {"name": name, "index": i}
                        for i, name in enumerate(outcome_names)
                    ]

                    for i, (name, price_str) in enumerate(zip(outcome_names, prices)):
                        try:
                            price = float(price_str)
                        except (ValueError, TypeError):
                            continue

                        results.append(
                            RawOddsData(
                                external_market_id=str(market_id),
                                market_title=question,
                                category=category,
                                platform_slug=self.platform_slug,
                                outcome_index=i,
                                outcome_name=str(name),
                                price=price,
                                price_format="probability",
                                volume_usd=_safe_float(market.get("volume")),
                                liquidity_usd=_safe_float(market.get("liquidity")),
                                market_url=f"https://polymarket.com/event/{event.get('slug', '')}",
                                market_description=market.get("description"),
                                end_date=None,
                                outcomes_json=outcomes_json,
                            )
                        )

        except httpx.HTTPError as e:
            self.logger.error("Polymarket API error", error=str(e))
        except Exception as e:
            self.logger.error("Polymarket parse error", error=str(e), exc_info=True)

        return results

    def stop(self) -> None:
        super().stop()
        if self.client:
            # Client will be garbage collected
            self.client = None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
