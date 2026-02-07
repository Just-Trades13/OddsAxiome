"""Core arbitrage detection math.
An arbitrage exists when the sum of the best implied probabilities
across all outcomes of a matched market is less than 1.0.
"""
from dataclasses import dataclass, field

import structlog

logger = structlog.get_logger()


@dataclass
class ArbLegData:
    platform: str
    market_id: str
    outcome_name: str
    price: float
    implied_prob: float


@dataclass
class ArbResult:
    market_title: str
    category: str
    total_implied: float  # Sum of best implied probs (< 1.0 means arb)
    expected_profit: float  # 1.0 - total_implied (as percentage of stake)
    legs: list[ArbLegData] = field(default_factory=list)


def detect_arbitrage(
    market_title: str,
    category: str,
    odds_by_outcome: dict[str, list[ArbLegData]],
    min_profit: float = 0.001,  # Minimum 0.1% profit to report
) -> ArbResult | None:
    """
    Given odds grouped by outcome name across platforms, detect if an arbitrage exists.

    odds_by_outcome = {
        "Yes": [ArbLegData(platform="polymarket", ...), ArbLegData(platform="kalshi", ...)],
        "No": [ArbLegData(platform="polymarket", ...), ArbLegData(platform="kalshi", ...)],
    }

    Returns ArbResult if profitable, None otherwise.
    """
    if len(odds_by_outcome) < 2:
        return None

    best_legs: list[ArbLegData] = []
    total_implied = 0.0

    for outcome_name, platform_odds in odds_by_outcome.items():
        if not platform_odds:
            return None  # Missing data for an outcome

        # Find the LOWEST implied probability for this outcome across all platforms
        # (lowest probability = best price to buy that outcome)
        best = min(platform_odds, key=lambda x: x.implied_prob)

        if best.implied_prob <= 0 or best.implied_prob >= 1.0:
            return None  # Invalid data

        best_legs.append(best)
        total_implied += best.implied_prob

    if total_implied >= 1.0:
        return None  # No arbitrage

    expected_profit = 1.0 - total_implied
    if expected_profit < min_profit:
        return None  # Profit too small

    return ArbResult(
        market_title=market_title,
        category=category,
        total_implied=round(total_implied, 6),
        expected_profit=round(expected_profit, 6),
        legs=best_legs,
    )


def calculate_stakes(arb: ArbResult, total_stake: float = 100.0) -> list[dict]:
    """
    Calculate optimal stake sizes for each leg of an arbitrage.
    Uses the formula: stake_i = total_stake * (1/implied_prob_i) / sum(1/implied_prob_j)
    """
    if not arb.legs:
        return []

    inv_probs = [1.0 / leg.implied_prob for leg in arb.legs]
    sum_inv = sum(inv_probs)

    return [
        {
            "platform": leg.platform,
            "outcome_name": leg.outcome_name,
            "implied_prob": leg.implied_prob,
            "stake": round(total_stake * inv / sum_inv, 2),
            "potential_payout": round(total_stake * inv / sum_inv / leg.implied_prob, 2),
        }
        for leg, inv in zip(arb.legs, inv_probs)
    ]
