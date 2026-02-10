"""Normalize raw odds from any platform format to implied probability (0.0-1.0)."""
from src.workers.base import NormalizedOdds, RawOddsData


def normalize_price(price: float, price_format: str) -> float:
    """Convert a raw price to implied probability."""
    match price_format:
        case "probability":
            # Already 0.0-1.0 (Polymarket, PredictIt, Gemini, Limitless)
            return max(0.0, min(1.0, price))
        case "cents":
            # Kalshi: 1-99 cents → divide by 100
            return max(0.0, min(1.0, price / 100.0))
        case "american_positive":
            # The Odds API: +150 → 100/(150+100) = 0.4
            if price <= 0:
                return 0.5
            return 100.0 / (price + 100.0)
        case "american_negative":
            # The Odds API: -200 → 200/(200+100) = 0.667
            abs_price = abs(price)
            if abs_price <= 0:
                return 0.5
            return abs_price / (abs_price + 100.0)
        case "decimal":
            # European odds: 2.50 → 1/2.50 = 0.4
            if price <= 0:
                return 0.0
            return 1.0 / price
        case _:
            # Unknown format, assume probability
            return max(0.0, min(1.0, price))


def normalize_batch(raw_odds: list[RawOddsData]) -> list[NormalizedOdds]:
    """Normalize a batch of raw odds to implied probability."""
    results = []
    for raw in raw_odds:
        implied = normalize_price(raw.price, raw.price_format)
        results.append(
            NormalizedOdds(
                external_market_id=raw.external_market_id,
                market_title=raw.market_title,
                category=raw.category,
                platform_slug=raw.platform_slug,
                outcome_index=raw.outcome_index,
                outcome_name=raw.outcome_name,
                price=raw.price,
                implied_prob=implied,
                outcome_type=raw.outcome_type,
                bid=raw.bid,
                ask=raw.ask,
                volume_24h=raw.volume_24h,
                volume_usd=raw.volume_usd,
                liquidity_usd=raw.liquidity_usd,
                market_url=raw.market_url,
                market_description=raw.market_description,
                end_date=raw.end_date,
                outcomes_json=raw.outcomes_json,
                captured_at=raw.captured_at,
            )
        )
    return results
