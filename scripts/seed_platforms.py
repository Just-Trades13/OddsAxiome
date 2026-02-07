"""Seed the platforms table with the 8 supported data sources."""
import asyncio

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import async_session_factory, engine
from src.models import Base, Platform

PLATFORMS = [
    {"slug": "polymarket", "name": "Polymarket", "platform_type": "prediction", "base_url": "https://polymarket.com"},
    {"slug": "kalshi", "name": "Kalshi", "platform_type": "prediction", "base_url": "https://kalshi.com"},
    {"slug": "predictit", "name": "PredictIt", "platform_type": "prediction", "base_url": "https://www.predictit.org"},
    {"slug": "draftkings", "name": "DraftKings", "platform_type": "sports", "base_url": "https://www.draftkings.com"},
    {"slug": "gemini", "name": "Gemini", "platform_type": "crypto", "base_url": "https://www.gemini.com"},
    {"slug": "coinbase", "name": "Coinbase", "platform_type": "crypto", "base_url": "https://www.coinbase.com"},
    {"slug": "robinhood", "name": "Robinhood", "platform_type": "prediction", "base_url": "https://robinhood.com"},
    {"slug": "limitless", "name": "Limitless", "platform_type": "prediction", "base_url": "https://limitless.exchange"},
]


async def seed():
    async with async_session_factory() as session:
        for p in PLATFORMS:
            existing = await session.execute(
                select(Platform).where(Platform.slug == p["slug"])
            )
            if existing.scalar_one_or_none() is None:
                session.add(Platform(**p))
                print(f"  Added platform: {p['name']}")
            else:
                print(f"  Already exists: {p['name']}")
        await session.commit()
    print("Platforms seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
