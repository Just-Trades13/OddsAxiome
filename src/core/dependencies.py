"""FastAPI dependencies for auth, database, redis, and tier gating."""
from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.exceptions import ForbiddenError, TierRequiredError, UnauthorizedError
from src.core.redis import get_redis
from src.core.security import verify_firebase_token
from src.models.user import User

TIER_ORDER = {"free": 0, "explorer": 1, "pro": 2}


async def get_current_user(
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and verify Firebase JWT, then look up the user in our DB."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    claims = await verify_firebase_token(token)
    if claims is None:
        raise UnauthorizedError("Invalid or expired Firebase token")

    firebase_uid = claims["uid"]
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedError("User not found. Call POST /api/v1/auth/sync first.")

    if not user.is_active:
        raise ForbiddenError("Account is deactivated")

    return user


async def get_optional_user(
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user but returns None instead of raising for unauthenticated requests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    claims = await verify_firebase_token(token)
    if claims is None:
        return None

    firebase_uid = claims["uid"]
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    return result.scalar_one_or_none()


async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    """Require admin privileges."""
    if not user.is_admin:
        raise ForbiddenError("Admin access required")
    return user


class TierGate:
    """Dependency that enforces a minimum subscription tier."""

    def __init__(self, minimum_tier: str):
        self.minimum_tier = minimum_tier

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        user_level = TIER_ORDER.get(user.tier, 0)
        required_level = TIER_ORDER.get(self.minimum_tier, 0)
        if user_level < required_level:
            raise TierRequiredError(self.minimum_tier)
        return user
