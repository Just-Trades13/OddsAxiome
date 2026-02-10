"""Create 3 test users in the database with different tiers.
Usage: python scripts/create_test_users.py
"""
import asyncio
import os
import sys

# Ensure the project root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from src.core.database import async_session_factory
from src.models.user import User


TEST_USERS = [
    {"firebase_uid": "GKDIx28NAQfEifWp6I0gTkrW6IE3", "email": "test.free@oddsaxiom.com", "display_name": "Test Free", "tier": "free"},
    {"firebase_uid": "4eOC1sGO86ejN8OVSWLHqMEucCX2", "email": "test.explorer@oddsaxiom.com", "display_name": "Test Explorer", "tier": "explorer"},
    {"firebase_uid": "NgAphQKQqGUaZcJn3CmgRsJ1w1g1", "email": "test.pro@oddsaxiom.com", "display_name": "Test Pro", "tier": "pro"},
]


async def main():
    async with async_session_factory() as session:
        for u in TEST_USERS:
            # Check if user already exists
            result = await session.execute(
                select(User).where(User.firebase_uid == u["firebase_uid"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.tier = u["tier"]
                print(f"Updated: {u['email']} → tier={u['tier']} (id={existing.id})")
            else:
                user = User(
                    firebase_uid=u["firebase_uid"],
                    email=u["email"],
                    display_name=u["display_name"],
                    tier=u["tier"],
                )
                session.add(user)
                print(f"Created: {u['email']} → tier={u['tier']}")

        await session.commit()
        print("\nDone! All test users ready.")


if __name__ == "__main__":
    asyncio.run(main())
