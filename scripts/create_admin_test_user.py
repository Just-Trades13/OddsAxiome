"""Create a test admin user via Firebase REST API + database insert.
Usage: railway run python scripts/create_admin_test_user.py
"""
import asyncio
import os
import sys
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from src.core.database import async_session_factory
from src.models.user import User

# Firebase Web API key (public, from frontend config)
FIREBASE_API_KEY = "AIzaSyAdRAGhL6ygycj_GY45CTKpVcGRwl3ejMQ"

# Test user credentials
EMAIL = "myles@oddsaxiom.com"
PASSWORD = "OddsAxiom2026!"
DISPLAY_NAME = "Myles (Admin)"


async def main():
    # Step 1: Create Firebase user via REST API
    print(f"Creating Firebase user: {EMAIL}")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}",
            json={
                "email": EMAIL,
                "password": PASSWORD,
                "displayName": DISPLAY_NAME,
                "returnSecureToken": True,
            },
        )
        data = resp.json()

    if "error" in data:
        if data["error"].get("message") == "EMAIL_EXISTS":
            print(f"Firebase user already exists, signing in instead...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
                    json={
                        "email": EMAIL,
                        "password": PASSWORD,
                        "returnSecureToken": True,
                    },
                )
                data = resp.json()
            if "error" in data:
                print(f"Firebase error: {data['error']}")
                sys.exit(1)
        else:
            print(f"Firebase error: {data['error']}")
            sys.exit(1)

    firebase_uid = data["localId"]
    print(f"Firebase UID: {firebase_uid}")

    # Step 2: Create or update DB user as admin + pro
    print("Inserting into database...")
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one_or_none()

        if user:
            user.tier = "pro"
            user.is_admin = True
            user.is_active = True
            print(f"Updated existing user: {user.email} → tier=pro, is_admin=True (id={user.id})")
        else:
            user = User(
                firebase_uid=firebase_uid,
                email=EMAIL,
                display_name=DISPLAY_NAME,
                tier="pro",
                is_admin=True,
                is_active=True,
            )
            session.add(user)
            print(f"Created new user: {EMAIL} → tier=pro, is_admin=True")

        await session.commit()
        # Re-fetch to get the ID
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()
        print(f"User ID: {user.id}")

    print(f"\n{'='*50}")
    print(f"TEST ACCOUNT READY")
    print(f"{'='*50}")
    print(f"Email:    {EMAIL}")
    print(f"Password: {PASSWORD}")
    print(f"Tier:     pro")
    print(f"Admin:    yes")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())
