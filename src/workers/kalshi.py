"""Kalshi ingestion worker — uses /events endpoint for structured market discovery.

The /events endpoint gives us:
  - Proper categories (Politics, Elections, Economics, etc.)
  - Nested markets with full price data
  - Clean titles like "Will Republican win the Presidency in 2028?"

The flat /markets endpoint is dominated by 3000+ sports parlays that bury
the political/economics markets we need for cross-platform matching.
"""
import asyncio
from collections import Counter

import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2"

# Kalshi event category → OddsAxiom category
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

# Fallback keyword matching for events with unmapped categories
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


def _classify_category(event_category: str, title: str) -> str:
    """Map a Kalshi event to an OddsAxiom category."""
    if event_category:
        mapped = KALSHI_CATEGORY_MAP.get(event_category.lower())
        if mapped:
            return mapped

    search = title.lower()
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
        """Fetch active markets via /events endpoint with nested markets.

        The events endpoint provides structured access to all Kalshi markets
        with proper categories, bypassing the 3000+ sports parlays that
        dominate the flat /markets endpoint.
        """
        if not self.client:
            return []

        results: list[RawOddsData] = []
        event_count = 0

        try:
            cursor = None
            pages = 0
            max_pages = 10  # 200 events/page = up to 2000 events

            while pages < max_pages:
                params = {"limit": 200, "with_nested_markets": "true"}
                if cursor:
                    params["cursor"] = cursor

                resp = await self.client.get("/events", params=params)
                if resp.status_code == 429:
                    self.logger.warning("Kalshi: rate limited, using partial results", pages=pages)
                    break
                resp.raise_for_status()
                data = resp.json()

                events = data.get("events", [])
                self.logger.info(
                    "Kalshi fetched events page",
                    page=pages + 1,
                    events=len(events),
                )

                for event in events:
                    event_category = event.get("category", "")
                    event_title = event.get("title", "")
                    category = _classify_category(event_category, event_title)

                    markets = event.get("markets", [])
                    active_markets = [
                        m for m in markets if m.get("status") == "active"
                    ]
                    if not active_markets:
                        continue

                    event_count += 1

                    # Count how many markets share each title.  When
                    # multiple candidates share a generic title (e.g.
                    # "Who will win the next presidential election?"),
                    # we append the candidate name from yes_sub_title
                    # to make each market title unique & matchable.
                    title_counts = Counter(
                        m.get("title", "") for m in active_markets
                    )

                    for market in active_markets:
                        ticker = market.get("ticker", "")
                        raw_title = market.get("title", "")
                        yes_sub = market.get("yes_sub_title", "")
                        yes_price = market.get("yes_ask") or market.get("last_price")
                        no_price = market.get("no_ask")
                        volume = market.get("volume")

                        if yes_price is None:
                            continue

                        # Build a unique, matchable title when this title
                        # is shared by multiple markets in the event
                        if title_counts[raw_title] > 1 and yes_sub:
                            title = _build_candidate_title(raw_title, yes_sub)
                        else:
                            title = raw_title

                        if not title:
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
                                volume_24h=_safe_float(market.get("volume_24h")),
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
                                    volume_24h=_safe_float(market.get("volume_24h")),
                                    market_url=f"https://kalshi.com/markets/{ticker}",
                                    outcomes_json=outcomes_json,
                                )
                            )

                cursor = data.get("cursor")
                pages += 1
                if not cursor or not events:
                    break
                await asyncio.sleep(1.5)  # 1.5s delay to avoid 429 rate limits

        except httpx.HTTPError as e:
            self.logger.error("Kalshi API error", error=str(e))
        except Exception as e:
            self.logger.error("Kalshi parse error", error=str(e), exc_info=True)

        self.logger.info(
            "Kalshi fetch complete",
            events=event_count,
            markets=len(results) // 2,
        )
        return results

    def stop(self) -> None:
        super().stop()
        if self.client:
            self.client = None


def _build_candidate_title(generic_title: str, candidate: str) -> str:
    """Turn a generic multi-candidate title into a candidate-specific one.

    "Who will win the next presidential election?" + "JD Vance"
    → "Will JD Vance win the next presidential election?"

    "Who will be the next Speaker of the House?" + "Hakeem Jeffries"
    → "Will Hakeem Jeffries be the next Speaker of the House?"

    Falls back to "generic_title: candidate" if parsing fails.
    """
    t = generic_title.strip()
    low = t.lower()

    # "Who will win X?" → "Will {candidate} win X?"
    if low.startswith("who will win "):
        rest = t[len("who will win "):]
        return f"Will {candidate} win {rest}"

    # "Who will be X?" → "Will {candidate} be X?"
    if low.startswith("who will be "):
        rest = t[len("who will be "):]
        return f"Will {candidate} be {rest}"

    # "Who will run for X?" → "Will {candidate} run for X?"
    if low.startswith("who will run for "):
        rest = t[len("who will run for "):]
        return f"Will {candidate} run for {rest}"

    # "Who will run in X?" → "Will {candidate} run in X?"
    if low.startswith("who will run in "):
        rest = t[len("who will run in "):]
        return f"Will {candidate} run in {rest}"

    # Fallback: "Title — Candidate"
    return f"{t} — {candidate}"


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
