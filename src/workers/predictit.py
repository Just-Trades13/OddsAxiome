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


def _build_candidate_title(generic_title: str, candidate: str) -> str:
    """Turn a generic multi-candidate title into a candidate-specific one.

    "Who will win the 2028 Democratic presidential nomination?" + "Gavin Newsom"
    → "Will Gavin Newsom win the 2028 Democratic presidential nomination?"
    """
    t = generic_title.strip()
    low = t.lower()

    if low.startswith("who will win "):
        rest = t[len("who will win "):]
        return f"Will {candidate} win {rest}"

    if low.startswith("who will be "):
        rest = t[len("who will be "):]
        return f"Will {candidate} be {rest}"

    if low.startswith("which party will win "):
        rest = t[len("which party will win "):]
        return f"Will {candidate} win {rest}"

    # Fallback: "Title — Candidate"
    return f"{t} — {candidate}"


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

                # Detect multi-candidate markets: >1 contract whose
                # names aren't simply "Yes"/"No".
                is_multi = len(contracts) > 1 and not all(
                    c.get("name", "").lower() in ("yes", "no")
                    for c in contracts
                )

                for i, contract in enumerate(contracts):
                    name = contract.get("name", contract.get("shortName", f"Option {i}"))
                    last_trade = contract.get("lastTradePrice")
                    best_buy_yes = contract.get("bestBuyYesCost")
                    best_buy_no = contract.get("bestBuyNoCost")

                    if last_trade is None:
                        continue

                    if is_multi:
                        # Split each candidate into its own market with
                        # a candidate-specific title so it matches
                        # Polymarket/Kalshi single-candidate markets.
                        title = _build_candidate_title(market_name, name)
                        ext_id = f"{market_id}_c{i}"
                        out_json = [
                            {"name": "Yes", "index": 0},
                            {"name": "No", "index": 1},
                        ]
                        no_price = float(best_buy_no) if best_buy_no else 1.0 - float(last_trade)

                        results.append(
                            RawOddsData(
                                external_market_id=ext_id,
                                market_title=title,
                                category=category,
                                platform_slug=self.platform_slug,
                                outcome_index=0,
                                outcome_name="Yes",
                                price=float(last_trade),
                                price_format="probability",
                                bid=float(best_buy_yes) if best_buy_yes else None,
                                ask=None,
                                volume_24h=None,
                                market_url=market_url,
                                outcomes_json=out_json,
                            )
                        )
                        results.append(
                            RawOddsData(
                                external_market_id=ext_id,
                                market_title=title,
                                category=category,
                                platform_slug=self.platform_slug,
                                outcome_index=1,
                                outcome_name="No",
                                price=no_price,
                                price_format="probability",
                                bid=None,
                                ask=float(best_buy_no) if best_buy_no else None,
                                volume_24h=None,
                                market_url=market_url,
                                outcomes_json=out_json,
                            )
                        )
                    else:
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
                                volume_24h=None,
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
