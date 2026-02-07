"""Seed the subscription_tiers table with free, explorer, and pro tiers."""
import asyncio

from sqlalchemy import select

from src.core.config import settings
from src.core.database import async_session_factory
from src.models import SubscriptionTier

TIERS = [
    {
        "slug": "free",
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "features": {"market_search": True, "basic_odds": True, "arb_alerts": False, "api_access": False},
        "max_watchlist": 5,
    },
    {
        "slug": "explorer",
        "name": "Explorer",
        "price_monthly": 49,
        "price_yearly": 39 * 12,
        "stripe_price_id_monthly": settings.stripe_price_id_explorer_monthly or None,
        "stripe_price_id_yearly": settings.stripe_price_id_explorer_yearly or None,
        "features": {"market_search": True, "basic_odds": True, "arb_alerts": True, "odds_history": True, "api_access": False},
        "max_watchlist": 50,
    },
    {
        "slug": "pro",
        "name": "Arbitrage Pro",
        "price_monthly": 149,
        "price_yearly": 119 * 12,
        "stripe_price_id_monthly": settings.stripe_price_id_pro_monthly or None,
        "stripe_price_id_yearly": settings.stripe_price_id_pro_yearly or None,
        "features": {"market_search": True, "basic_odds": True, "arb_alerts": True, "odds_history": True, "arb_history": True, "api_access": True},
        "max_watchlist": -1,  # unlimited
    },
]


async def seed():
    async with async_session_factory() as session:
        for t in TIERS:
            existing = await session.execute(
                select(SubscriptionTier).where(SubscriptionTier.slug == t["slug"])
            )
            if existing.scalar_one_or_none() is None:
                session.add(SubscriptionTier(**t))
                print(f"  Added tier: {t['name']} (${t['price_monthly']}/mo)")
            else:
                print(f"  Already exists: {t['name']}")
        await session.commit()
    print("Subscription tiers seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
