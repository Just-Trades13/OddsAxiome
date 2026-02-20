"""DraftKings prediction market ingestion worker — Apify actor for market discovery.

Uses the HypeBridge DraftKings Predictions Apify actor to fetch prediction
market data from DraftKings.  The actor scrapes DraftKings prediction markets
(sports, politics, economics, crypto, etc.) and returns structured data via
the Apify dataset API.

API endpoint pattern:
  https://api.apify.com/v2/acts/hypebridge~draftkings-predictions/runs/last/dataset/items?token={TOKEN}
"""
import json
from datetime import datetime, timezone

import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

APIFY_ACTOR_DATASET_URL = (
    "https://api.apify.com/v2/acts/hypebridge~draftkings-predictions"
    "/runs/last/dataset/items"
)

DRAFTKINGS_PREDICTIONS_BASE_URL = "https://sportsbook.draftkings.com"

# ---------------------------------------------------------------------------
# Category classification
# ---------------------------------------------------------------------------

# DraftKings often includes a category/sport/tag field.  Map known values
# first, then fall back to keyword matching on the title.
DK_CATEGORY_MAP = {
    # Sports
    "nfl": "sports",
    "nba": "sports",
    "mlb": "sports",
    "nhl": "sports",
    "ncaaf": "sports",
    "ncaab": "sports",
    "cfb": "sports",
    "cbb": "sports",
    "soccer": "sports",
    "mls": "sports",
    "ufc": "sports",
    "mma": "sports",
    "tennis": "sports",
    "golf": "sports",
    "pga": "sports",
    "boxing": "sports",
    "nascar": "sports",
    "f1": "sports",
    "wnba": "sports",
    "xfl": "sports",
    "rugby": "sports",
    "cricket": "sports",
    "sports": "sports",
    # Politics
    "politics": "politics",
    "elections": "politics",
    "election": "politics",
    "government": "politics",
    "policy": "politics",
    # Economics / Finance
    "economics": "economics",
    "economy": "economics",
    "finance": "economics",
    "stock market": "economics",
    "stocks": "economics",
    "commodities": "economics",
    "financial": "economics",
    # Crypto
    "crypto": "crypto",
    "cryptocurrency": "crypto",
    "bitcoin": "crypto",
    "ethereum": "crypto",
    # Science / Tech
    "science": "science",
    "technology": "science",
    "tech": "science",
    "ai": "science",
    "space": "science",
    "climate": "science",
    "weather": "science",
    # Culture / Entertainment
    "entertainment": "culture",
    "culture": "culture",
    "music": "culture",
    "movies": "culture",
    "tv": "culture",
    "awards": "culture",
    "oscars": "culture",
    "grammys": "culture",
    "reality tv": "culture",
    "celebrity": "culture",
    "social media": "culture",
}

KEYWORD_MAP = {
    "trump": "politics",
    "biden": "politics",
    "president": "politics",
    "congress": "politics",
    "senate": "politics",
    "governor": "politics",
    "election": "politics",
    "vote": "politics",
    "democrat": "politics",
    "republican": "politics",
    "fed ": "economics",
    "inflation": "economics",
    "gdp": "economics",
    "interest rate": "economics",
    "jobs report": "economics",
    "unemployment": "economics",
    "recession": "economics",
    "cpi": "economics",
    "stock": "economics",
    "s&p": "economics",
    "dow": "economics",
    "nasdaq": "economics",
    "bitcoin": "crypto",
    "ethereum": "crypto",
    "crypto": "crypto",
    "btc": "crypto",
    "eth": "crypto",
    "nfl": "sports",
    "nba": "sports",
    "mlb": "sports",
    "nhl": "sports",
    "super bowl": "sports",
    "world series": "sports",
    "stanley cup": "sports",
    "mvp": "sports",
    "touchdown": "sports",
    "quarterback": "sports",
    "oscar": "culture",
    "grammy": "culture",
    "emmy": "culture",
    "climate": "science",
    "temperature": "science",
    "hurricane": "science",
    "ai ": "science",
    "artificial intelligence": "science",
    "spacex": "science",
    "nasa": "science",
}


def _classify_category(
    category_raw: str | None,
    subcategory_raw: str | None,
    title: str,
) -> str:
    """Classify a DraftKings market into one of the 6 OddsAxiom categories.

    Checks the explicit category/subcategory fields first, then falls back
    to keyword matching on the market title.
    """
    # Try explicit category fields
    for field_val in (subcategory_raw, category_raw):
        if field_val:
            mapped = DK_CATEGORY_MAP.get(field_val.lower().strip())
            if mapped:
                return mapped

    # Keyword fallback on title
    search = title.lower()
    for keyword, cat in KEYWORD_MAP.items():
        if keyword in search:
            return cat

    return "sports"  # DraftKings is primarily a sportsbook


# ---------------------------------------------------------------------------
# Flexible field extraction helpers
# ---------------------------------------------------------------------------

def _extract_str(item: dict, *keys: str, default: str = "") -> str:
    """Return the first non-empty string value found for the given keys."""
    for key in keys:
        val = item.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return default


def _extract_float(item: dict, *keys: str) -> float | None:
    """Return the first parseable float for the given keys, or None."""
    for key in keys:
        val = item.get(key)
        if val is not None:
            try:
                return float(val)
            except (ValueError, TypeError):
                continue
    return None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _parse_outcomes(item: dict) -> list[dict]:
    """Extract outcomes from a DraftKings item.

    Apify actors for prediction markets typically return outcomes in one
    of several formats:
      1. A list of dicts under "outcomes", "selections", "runners", or "options"
      2. Separate "yesPrice"/"noPrice" fields for binary markets
      3. Nested under "market.outcomes" or "markets[0].outcomes"
      4. Flat fields like "price", "probability", "odds" for a single outcome

    Returns a list of dicts with keys: name, price, price_format.
    """
    outcomes = []

    # ------------------------------------------------------------------
    # Strategy 1: Look for an explicit outcomes list
    # ------------------------------------------------------------------
    for list_key in ("outcomes", "selections", "runners", "options", "offers"):
        raw = item.get(list_key)
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except (json.JSONDecodeError, ValueError):
                raw = None
        if isinstance(raw, list) and raw:
            for entry in raw:
                if isinstance(entry, dict):
                    name = _extract_str(entry, "name", "label", "title", "outcome", "participant")
                    price = _extract_float(entry, "price", "odds", "probability", "prob", "decimal_odds", "american_odds", "line")
                    if name and price is not None:
                        pf = _guess_price_format(price, entry)
                        outcomes.append({"name": name, "price": price, "price_format": pf})
            if outcomes:
                return outcomes

    # ------------------------------------------------------------------
    # Strategy 2: Nested market(s) object
    # ------------------------------------------------------------------
    nested_market = item.get("market") or {}
    if isinstance(nested_market, dict):
        nested_outcomes = nested_market.get("outcomes", nested_market.get("selections", []))
        if isinstance(nested_outcomes, list):
            for entry in nested_outcomes:
                if isinstance(entry, dict):
                    name = _extract_str(entry, "name", "label", "title", "outcome")
                    price = _extract_float(entry, "price", "odds", "probability")
                    if name and price is not None:
                        pf = _guess_price_format(price, entry)
                        outcomes.append({"name": name, "price": price, "price_format": pf})
            if outcomes:
                return outcomes

    nested_markets = item.get("markets", [])
    if isinstance(nested_markets, list):
        for mkt in nested_markets:
            if isinstance(mkt, dict):
                mkt_outcomes = mkt.get("outcomes", mkt.get("selections", []))
                if isinstance(mkt_outcomes, list):
                    for entry in mkt_outcomes:
                        if isinstance(entry, dict):
                            name = _extract_str(entry, "name", "label", "title", "outcome")
                            price = _extract_float(entry, "price", "odds", "probability")
                            if name and price is not None:
                                pf = _guess_price_format(price, entry)
                                outcomes.append({"name": name, "price": price, "price_format": pf})
                if outcomes:
                    return outcomes

    # ------------------------------------------------------------------
    # Strategy 3: Binary yes/no fields
    # ------------------------------------------------------------------
    yes_price = _extract_float(item, "yesPrice", "yes_price", "yesProbability", "yes_probability", "yesOdds")
    no_price = _extract_float(item, "noPrice", "no_price", "noProbability", "no_probability", "noOdds")
    if yes_price is not None:
        pf = _guess_price_format(yes_price, item)
        outcomes.append({"name": "Yes", "price": yes_price, "price_format": pf})
        if no_price is not None:
            outcomes.append({"name": "No", "price": no_price, "price_format": pf})
        else:
            # Complement for binary market
            complement = 1.0 - yes_price if 0 < yes_price < 1 else None
            if complement is not None:
                outcomes.append({"name": "No", "price": complement, "price_format": pf})
        return outcomes

    # ------------------------------------------------------------------
    # Strategy 4: Single flat price (the item IS the outcome)
    # ------------------------------------------------------------------
    flat_price = _extract_float(item, "price", "odds", "probability", "prob", "line", "decimal_odds")
    if flat_price is not None:
        name = _extract_str(item, "outcome", "selection", "participant", "name", "label", "title", default="Yes")
        pf = _guess_price_format(flat_price, item)
        outcomes.append({"name": name, "price": flat_price, "price_format": pf})
        # If there's an opponent/complement
        opponent_price = _extract_float(item, "opponent_price", "opponent_odds", "away_odds")
        opponent_name = _extract_str(item, "opponent", "away", "opponent_name", default="No")
        if opponent_price is not None:
            outcomes.append({"name": opponent_name, "price": opponent_price, "price_format": pf})
        return outcomes

    return outcomes


def _guess_price_format(price: float, context: dict | None = None) -> str:
    """Best-effort guess of price format based on value range.

    - 0.0 to 1.0  : probability
    - 1.0 to 99.9 : cents (Kalshi style) or probability percentage
    - 100+/-       : american odds
    - 1.01 to ~50 : decimal odds
    """
    # Check for explicit format hints
    if context:
        fmt = _extract_str(context, "price_format", "odds_format", "format", "type")
        fmt_lower = fmt.lower()
        if "american" in fmt_lower:
            return "american_positive" if price >= 0 else "american_negative"
        if "decimal" in fmt_lower:
            return "decimal"
        if "prob" in fmt_lower:
            return "probability"
        if "cent" in fmt_lower:
            return "cents"

    if 0.0 <= price <= 1.0:
        return "probability"
    if price > 100 or price < -100:
        return "american_positive" if price >= 0 else "american_negative"
    if 1.0 < price <= 99.99:
        # Could be cents (1-99) or decimal odds (1.01 - ~50).
        # DraftKings typically uses American odds, but Apify actors
        # often normalize to decimal or probability.  Treat as cents
        # if it looks like an integer-ish value, decimal otherwise.
        if price == int(price) and price <= 99:
            return "cents"
        return "decimal"
    return "probability"


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------

class DraftKingsWorker(BaseIngestionWorker):
    """Ingests DraftKings prediction market data via the HypeBridge Apify actor."""

    platform_slug = "draftkings"
    poll_interval = 60.0  # DraftKings data doesn't change as fast

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None
        self.apify_token: str = getattr(config, "apify_api_token", "")

    async def connect(self) -> None:
        self.client = httpx.AsyncClient(
            timeout=60,  # Apify datasets can be large
            headers={"Accept": "application/json"},
        )
        if not self.apify_token:
            self.logger.warning(
                "No APIFY_API_TOKEN configured - DraftKings worker will not fetch data"
            )
        else:
            self.logger.info("Connected to DraftKings via Apify actor")

    async def fetch_markets(self) -> list[RawOddsData]:
        """Fetch the latest DraftKings prediction market data from the Apify dataset."""
        if not self.client or not self.apify_token:
            return []

        results: list[RawOddsData] = []

        try:
            resp = await self.client.get(
                APIFY_ACTOR_DATASET_URL,
                params={"token": self.apify_token},
            )

            # Handle specific HTTP errors gracefully
            if resp.status_code == 404:
                self.logger.debug(
                    "Apify DraftKings actor has no completed runs yet (404)"
                )
                return []

            if resp.status_code == 402:
                self.logger.warning(
                    "Apify API returned 402 — check Apify plan/usage limits"
                )
                return []

            if resp.status_code == 429:
                self.logger.warning(
                    "Apify rate limit hit (429) — will retry next poll cycle"
                )
                return []

            if resp.status_code == 401:
                self.logger.error(
                    "Apify API returned 401 — APIFY_API_TOKEN is invalid or expired"
                )
                return []

            resp.raise_for_status()

            # Ensure we got JSON, not HTML
            content_type = resp.headers.get("content-type", "")
            if "html" in content_type:
                self.logger.warning(
                    "Apify returned HTML instead of JSON — token may be wrong"
                )
                return []

            try:
                data = resp.json()
            except json.JSONDecodeError:
                self.logger.error("Apify returned non-JSON response")
                return []

            # The dataset API returns a JSON array of items
            if isinstance(data, dict):
                # Some Apify responses wrap items in a top-level key
                items = (
                    data.get("items")
                    or data.get("data")
                    or data.get("results")
                    or data.get("markets")
                    or [data]
                )
            elif isinstance(data, list):
                items = data
            else:
                self.logger.warning("Unexpected Apify response type", type=type(data).__name__)
                return []

            if not items:
                self.logger.debug("Apify DraftKings dataset is empty")
                return []

            self.logger.info(
                "DraftKings Apify dataset fetched",
                item_count=len(items),
            )

            for item in items:
                if not isinstance(item, dict):
                    continue

                results.extend(self._parse_item(item))

        except httpx.TimeoutException:
            self.logger.warning("Apify DraftKings request timed out — will retry")
        except httpx.HTTPError as e:
            self.logger.error("DraftKings Apify API error", error=str(e))
        except Exception as e:
            self.logger.error(
                "DraftKings parse error", error=str(e), exc_info=True
            )

        self.logger.info(
            "DraftKings fetch complete",
            outcomes=len(results),
        )
        return results

    def _parse_item(self, item: dict) -> list[RawOddsData]:
        """Parse a single Apify dataset item into RawOddsData objects.

        Handles multiple possible response shapes from the actor.
        """
        results: list[RawOddsData] = []

        # Extract market identity
        market_id = _extract_str(
            item,
            "id", "eventId", "event_id", "marketId", "market_id",
            "offerId", "offer_id", "contestId",
        )
        title = _extract_str(
            item,
            "title", "name", "question", "eventName", "event_name",
            "market_name", "marketName", "description", "label",
        )

        if not title:
            return []

        # Generate a stable market ID if none provided
        if not market_id:
            market_id = f"dk-{hash(title) & 0xFFFFFFFF:08x}"

        # Extract category
        category_raw = _extract_str(item, "category", "sport", "sportName", "sport_name", "group")
        subcategory_raw = _extract_str(item, "subcategory", "subCategory", "league", "competition")
        category = _classify_category(category_raw, subcategory_raw, title)

        # Extract market URL
        market_url = _extract_str(
            item,
            "url", "link", "marketUrl", "market_url", "eventUrl", "event_url",
        )
        if not market_url:
            # Build a reasonable default URL
            slug = _extract_str(item, "slug", "eventSlug", "urlSlug")
            if slug:
                market_url = f"{DRAFTKINGS_PREDICTIONS_BASE_URL}/{slug}"
            else:
                market_url = f"{DRAFTKINGS_PREDICTIONS_BASE_URL}/predictions"

        # Extract description
        description = _extract_str(
            item, "description", "details", "summary", "info",
        )

        # Extract end date
        end_date = _parse_end_date(item)

        # Extract volume/liquidity if available
        volume_usd = _extract_float(item, "volume", "volumeUsd", "volume_usd", "totalVolume", "handle")
        liquidity_usd = _extract_float(item, "liquidity", "liquidityUsd", "liquidity_usd")

        # Parse outcomes
        outcomes = _parse_outcomes(item)
        if not outcomes:
            return []

        outcomes_json = [
            {"name": o["name"], "index": i}
            for i, o in enumerate(outcomes)
        ]

        for i, outcome in enumerate(outcomes):
            results.append(
                RawOddsData(
                    external_market_id=str(market_id),
                    market_title=title,
                    category=category,
                    platform_slug=self.platform_slug,
                    outcome_index=i,
                    outcome_name=outcome["name"],
                    price=outcome["price"],
                    price_format=outcome["price_format"],
                    volume_usd=_safe_float(volume_usd),
                    liquidity_usd=_safe_float(liquidity_usd),
                    market_url=market_url,
                    market_description=description or None,
                    end_date=end_date,
                    outcomes_json=outcomes_json,
                )
            )

        return results

    def stop(self) -> None:
        super().stop()
        if self.client:
            self.client = None


def _parse_end_date(item: dict) -> datetime | None:
    """Try to parse an end/expiry date from the item."""
    for key in ("endDate", "end_date", "expiryDate", "expiry_date",
                "closesAt", "closes_at", "deadline", "eventDate", "event_date",
                "startTime", "start_time"):
        val = item.get(key)
        if val is None:
            continue
        if isinstance(val, (int, float)):
            # Unix timestamp
            try:
                return datetime.fromtimestamp(val, tz=timezone.utc)
            except (OSError, OverflowError, ValueError):
                continue
        if isinstance(val, str) and val.strip():
            for fmt in (
                "%Y-%m-%dT%H:%M:%S.%fZ",
                "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d",
            ):
                try:
                    dt = datetime.strptime(val.strip(), fmt)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except ValueError:
                    continue
    return None
