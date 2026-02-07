"""Abstract base class for all ingestion workers."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone

import structlog

logger = structlog.get_logger()


@dataclass
class RawOddsData:
    """Raw odds data from a single platform for one market outcome."""
    external_market_id: str
    market_title: str
    category: str
    platform_slug: str
    outcome_index: int
    outcome_name: str
    price: float  # Raw price in platform's native format
    price_format: str  # 'probability', 'cents', 'american_positive', 'american_negative', 'decimal'
    bid: float | None = None
    ask: float | None = None
    volume_24h: float | None = None
    volume_usd: float | None = None
    liquidity_usd: float | None = None
    market_url: str | None = None
    market_description: str | None = None
    end_date: datetime | None = None
    outcomes_json: list[dict] = field(default_factory=list)
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class NormalizedOdds:
    """Odds normalized to implied probability (0.0 to 1.0)."""
    external_market_id: str
    market_title: str
    category: str
    platform_slug: str
    outcome_index: int
    outcome_name: str
    price: float  # Original price
    implied_prob: float  # Normalized 0.0-1.0
    bid: float | None = None
    ask: float | None = None
    volume_24h: float | None = None
    volume_usd: float | None = None
    liquidity_usd: float | None = None
    market_url: str | None = None
    market_description: str | None = None
    end_date: datetime | None = None
    outcomes_json: list[dict] = field(default_factory=list)
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class BaseIngestionWorker(ABC):
    """All ingestion workers inherit from this."""

    platform_slug: str = ""
    poll_interval: float = 30.0  # seconds between polls for REST sources

    def __init__(self, redis_pool, config):
        self.redis = redis_pool
        self.config = config
        self._running = False
        self.logger = structlog.get_logger().bind(worker=self.platform_slug)

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the data source."""

    @abstractmethod
    async def fetch_markets(self) -> list[RawOddsData]:
        """Fetch current markets and their odds from the platform."""

    async def run(self) -> None:
        """Main loop: connect, fetch, normalize, publish, repeat."""
        self.logger.info("Worker starting", poll_interval=self.poll_interval)
        await self.connect()
        self._running = True

        while self._running:
            try:
                raw_odds = await self.fetch_markets()
                if raw_odds:
                    from src.workers.normalizer import normalize_batch
                    from src.workers.publisher import publish_odds

                    normalized = normalize_batch(raw_odds)
                    await publish_odds(self.redis, normalized)
                    self.logger.info(
                        "Published odds",
                        count=len(normalized),
                        platform=self.platform_slug,
                    )
                else:
                    self.logger.debug("No odds data received")
            except Exception as e:
                self.logger.error("Worker fetch error", error=str(e), exc_info=True)

            if self.poll_interval > 0:
                import asyncio
                await asyncio.sleep(self.poll_interval)

    def stop(self) -> None:
        self._running = False
        self.logger.info("Worker stopping")
