"""The Odds API worker — covers DraftKings, FanDuel, and other sportsbooks."""
import asyncio

import httpx
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()

THE_ODDS_API_BASE = "https://api.the-odds-api.com/v4"

# Sports keys from The Odds API that map to our categories
SPORT_CATEGORY_MAP = {
    "americanfootball_nfl": "sports",
    "americanfootball_ncaaf": "sports",
    "basketball_nba": "sports",
    "basketball_ncaab": "sports",
    "baseball_mlb": "sports",
    "icehockey_nhl": "sports",
    "soccer_epl": "sports",
    "soccer_usa_mls": "sports",
    "mma_mixed_martial_arts": "sports",
    "politics_us_presidential_election_winner": "politics",
}

# Which sports to fetch — keep this list tight to conserve API quota
# Free plan: 500 requests/month. Each sport = 1 request per poll cycle.
SPORTS_TO_FETCH = [
    "basketball_nba",
    "icehockey_nhl",
    "baseball_mlb",
    "soccer_epl",
    "mma_mixed_martial_arts",
    "americanfootball_nfl",
]


class TheOddsAPIWorker(BaseIngestionWorker):
    platform_slug = "draftkings"  # Primary bookmaker we pull from this source
    # Free plan: 500 requests/month. 6 sports × 1 req each per cycle.
    # At 5 min: 6 × 288/day = 1,728/day — burns quota in ~9 days.
    # At 15 min: 6 × 96/day = 576/day — burns in ~26 days. Close but OK.
    # Rate limit fix: 2s delay between sport requests prevents 429 errors.
    poll_interval = 300.0  # 5 minutes — Redis TTL is 660s so data persists between polls

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)
        self.client: httpx.AsyncClient | None = None
        self.api_key = config.the_odds_api_key

    async def connect(self) -> None:
        if not self.api_key:
            self.logger.warning("THE_ODDS_API_KEY not set — worker will not fetch data")
        self.client = httpx.AsyncClient(timeout=30)
        self.logger.info("Connected to The Odds API", has_key=bool(self.api_key))

    async def fetch_markets(self) -> list[RawOddsData]:
        if not self.client or not self.api_key:
            return []

        results: list[RawOddsData] = []

        for sport_key in SPORTS_TO_FETCH:
            try:
                resp = await self.client.get(
                    f"{THE_ODDS_API_BASE}/sports/{sport_key}/odds/",
                    params={
                        "apiKey": self.api_key,
                        "regions": "us",
                        "markets": "h2h",
                        "oddsFormat": "american",
                        "bookmakers": "draftkings,fanduel,betmgm,bovada,betrivers",
                    },
                )

                if resp.status_code == 401:
                    self.logger.error("The Odds API: invalid API key")
                    return results
                if resp.status_code == 429:
                    self.logger.warning("The Odds API: rate limited")
                    break

                resp.raise_for_status()
                events = resp.json()
                category = SPORT_CATEGORY_MAP.get(sport_key, "sports")

                for event in events:
                    event_id = event.get("id", "")
                    home = event.get("home_team", "")
                    away = event.get("away_team", "")
                    title = f"{away} @ {home}" if home and away else event_id

                    for bookmaker in event.get("bookmakers", []):
                        bk_key = bookmaker.get("key", "")
                        for market in bookmaker.get("markets", []):
                            if market.get("key") != "h2h":
                                continue

                            outcomes_json = [
                                {"name": o.get("name", ""), "index": i}
                                for i, o in enumerate(market.get("outcomes", []))
                            ]

                            for i, outcome in enumerate(market.get("outcomes", [])):
                                name = outcome.get("name", "")
                                price = outcome.get("price", 0)

                                if price == 0:
                                    continue

                                price_format = (
                                    "american_negative" if price < 0 else "american_positive"
                                )

                                results.append(
                                    RawOddsData(
                                        external_market_id=f"{event_id}_{bk_key}",
                                        market_title=title,
                                        category=category,
                                        platform_slug=bk_key,  # draftkings, fanduel, betmgm, bovada, betrivers
                                        outcome_index=i,
                                        outcome_name=name,
                                        price=float(price),
                                        price_format=price_format,
                                        outcome_type="moneyline",
                                        market_url=None,
                                        outcomes_json=outcomes_json,
                                    )
                                )

                # Log remaining quota from response headers
                remaining = resp.headers.get("x-requests-remaining")
                if remaining:
                    self.logger.info("Odds API quota", sport=sport_key, remaining=remaining, events=len(events))

                # Delay between sport requests to avoid burst rate limiting
                await asyncio.sleep(2)

            except httpx.HTTPError as e:
                self.logger.error("The Odds API error", sport=sport_key, error=str(e))

        return results

    def stop(self) -> None:
        super().stop()
        if self.client:
            self.client = None
