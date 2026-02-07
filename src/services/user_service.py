"""User creation, sync, and management."""
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from src.models.user import User
from src.services.hubspot_service import create_hubspot_contact

logger = structlog.get_logger()


async def sync_user(
    db: AsyncSession,
    firebase_uid: str,
    email: str,
    display_name: str | None = None,
    photo_url: str | None = None,
    ref_code: str | None = None,
) -> User:
    """
    Create or update a user record on login.
    Called by POST /auth/sync after Firebase JWT is verified.
    """
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None:
        # New user
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            display_name=display_name,
            photo_url=photo_url,
            ref_code_used=ref_code,
            tier="free",
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()  # Get the ID assigned
        logger.info("New user created", user_id=str(user.id), email=email)

        # Create HubSpot contact in background (don't block login)
        try:
            contact_id = await create_hubspot_contact(email, display_name)
            if contact_id:
                user.hubspot_contact_id = contact_id
        except Exception as e:
            logger.warning("HubSpot contact creation failed", error=str(e))

    else:
        # Existing user — update last login
        user.last_login_at = datetime.now(timezone.utc)
        if display_name and not user.display_name:
            user.display_name = display_name
        if photo_url and not user.photo_url:
            user.photo_url = photo_url

    return user


async def update_user(
    db: AsyncSession,
    user: User,
    display_name: str | None = None,
    photo_url: str | None = None,
) -> User:
    """Update user profile fields."""
    if display_name is not None:
        user.display_name = display_name
    if photo_url is not None:
        user.photo_url = photo_url
    return user


async def get_user_by_id(db: AsyncSession, user_id) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
