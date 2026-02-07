"""Main arbitrage engine — consumes odds from Redis Stream, detects arbs, writes to DB."""
import asyncio
from collections import defaultdict
from datetime import datetime, timezone

import orjson
import structlog

from src.arbengine.detector import ArbLegData, ArbResult, detect_arbitrage

logger = structlog.get_logger()

STREAM_KEY = "odds:normalized"
CONSUMER_GROUP = "arbengine"
CONSUMER_NAME = "arb-worker-1"
ARB_ALERT_CHANNEL = "arb:alerts"

# Buffer odds for grouping by market before detection
DETECTION_INTERVAL = 5.0  # Run detection every 5 seconds


class ArbEngine:
    def __init__(self, redis_pool, config):
        self.redis = redis_pool
        self.config = config
        self._running = False
        # Buffer: {market_title: {outcome_name: [ArbLegData, ...]}}
        self._odds_buffer: dict[str, dict[str, list[ArbLegData]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self._market_categories: dict[str, str] = {}

    async def run(self) -> None:
        """Main loop: consume stream + periodic detection."""
        logger.info("Arbitrage engine starting")

        # Create consumer group if it doesn't exist
        try:
            await self.redis.xgroup_create(STREAM_KEY, CONSUMER_GROUP, id="0", mkstream=True)
        except Exception:
            pass  # Group already exists

        self._running = True

        # Run consumer and detector concurrently
        await asyncio.gather(
            self._consume_stream(),
            self._detection_loop(),
        )

    async def _consume_stream(self) -> None:
        """Read odds updates from Redis Stream and buffer them."""
        while self._running:
            try:
                messages = await self.redis.xreadgroup(
                    CONSUMER_GROUP,
                    CONSUMER_NAME,
                    {STREAM_KEY: ">"},
                    count=100,
                    block=2000,
                )

                if not messages:
                    continue

                for stream_name, entries in messages:
                    for msg_id, data in entries:
                        self._process_message(data)
                        await self.redis.xack(STREAM_KEY, CONSUMER_GROUP, msg_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Stream consume error", error=str(e))
                await asyncio.sleep(1)

    def _process_message(self, data: dict) -> None:
        """Buffer an odds update for the next detection cycle."""
        market_title = data.get("market_title", "")
        outcome_name = data.get("outcome_name", "")
        platform = data.get("platform", "")
        market_id = data.get("market_id", "")
        category = data.get("category", "")

        if not all([market_title, outcome_name, platform]):
            return

        try:
            implied_prob = float(data.get("implied_prob", 0))
            price = float(data.get("price", 0))
        except (ValueError, TypeError):
            return

        if implied_prob <= 0 or implied_prob >= 1.0:
            return

        self._market_categories[market_title] = category

        leg = ArbLegData(
            platform=platform,
            market_id=market_id,
            outcome_name=outcome_name,
            price=price,
            implied_prob=implied_prob,
        )

        # Keep only the latest odds per platform per outcome
        outcome_odds = self._odds_buffer[market_title][outcome_name]
        # Remove old entry from same platform
        self._odds_buffer[market_title][outcome_name] = [
            o for o in outcome_odds if o.platform != platform
        ] + [leg]

    async def _detection_loop(self) -> None:
        """Periodically scan the buffer for arbitrage opportunities."""
        while self._running:
            try:
                await asyncio.sleep(DETECTION_INTERVAL)
                await self._run_detection()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Detection loop error", error=str(e))

    async def _run_detection(self) -> None:
        """Scan all buffered markets for arbitrage opportunities."""
        arb_count = 0

        for market_title, odds_by_outcome in self._odds_buffer.items():
            # Need odds from at least 2 platforms for any outcome to have an arb
            has_multi_platform = any(
                len(legs) >= 2 for legs in odds_by_outcome.values()
            )
            if not has_multi_platform:
                continue

            category = self._market_categories.get(market_title, "")
            result = detect_arbitrage(market_title, category, dict(odds_by_outcome))

            if result:
                arb_count += 1
                await self._publish_arb(result)

        if arb_count > 0:
            logger.info("Arbitrage opportunities detected", count=arb_count)

    async def _publish_arb(self, arb: ArbResult) -> None:
        """Publish arbitrage alert to Redis pub/sub for WebSocket clients."""
        alert = {
            "type": "arb_alert",
            "data": {
                "market_title": arb.market_title,
                "category": arb.category,
                "expected_profit": arb.expected_profit,
                "total_implied": arb.total_implied,
                "legs": [
                    {
                        "platform": leg.platform,
                        "outcome_name": leg.outcome_name,
                        "price": leg.price,
                        "implied_prob": leg.implied_prob,
                    }
                    for leg in arb.legs
                ],
                "detected_at": datetime.now(timezone.utc).isoformat(),
            },
        }

        await self.redis.publish(ARB_ALERT_CHANNEL, orjson.dumps(alert).decode())
        logger.info(
            "Arb alert published",
            market=arb.market_title,
            profit=f"{arb.expected_profit:.2%}",
        )

    def stop(self) -> None:
        self._running = False
