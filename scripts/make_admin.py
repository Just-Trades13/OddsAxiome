"""Promote a user to admin by email address.

Usage: python scripts/make_admin.py user@example.com
"""
import asyncio
import sys

from sqlalchemy import select

from src.core.database import async_session_factory
from src.models.user import User


async def make_admin(email: str):
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"No user found with email: {email}")
            print("(User must sign up first via the app)")
            return

        if user.is_admin:
            print(f"{email} is already an admin")
            return

        user.is_admin = True
        await session.commit()
        print(f"Promoted {email} to admin (id={user.id})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/make_admin.py user@example.com")
        sys.exit(1)
    asyncio.run(make_admin(sys.argv[1]))
