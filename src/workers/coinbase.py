"""Coinbase prediction markets worker.

Coinbase's prediction markets are powered by a Kalshi partnership — all market
data flows through Kalshi's order books.  Coinbase does NOT expose a separate
public prediction markets API.  Our Kalshi worker already ingests this data.

This worker is kept as a placeholder:
  - If Coinbase ever launches a standalone API, we can activate it here.
  - For now it returns empty on every poll (no wasted requests).
"""
import structlog

from src.workers.base import BaseIngestionWorker, RawOddsData

logger = structlog.get_logger()


class CoinbaseWorker(BaseIngestionWorker):
    platform_slug = "coinbase"
    poll_interval = 300.0  # Low-frequency — placeholder only

    def __init__(self, redis_pool, config):
        super().__init__(redis_pool, config)

    async def connect(self) -> None:
        self.logger.info(
            "Coinbase worker initialized (Kalshi partnership — no separate API)"
        )

    async def fetch_markets(self) -> list[RawOddsData]:
        # Coinbase prediction markets use Kalshi data.
        # Our Kalshi worker already ingests all markets.
        return []

    def stop(self) -> None:
        super().stop()
