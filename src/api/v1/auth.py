"""Auth endpoints — user sync on first Firebase login."""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.exceptions import UnauthorizedError
from src.core.security import verify_firebase_token
from src.schemas.user import UserResponse, UserSyncRequest
from src.services.user_service import sync_user

router = APIRouter()


@router.post("/sync", response_model=UserResponse)
async def auth_sync(
    body: UserSyncRequest | None = None,
    authorization: str | None = Header(None, alias="Authorization"),
    db: AsyncSession = Depends(get_db),
):
    """
    Create or sync a user after Firebase authentication.
    Called by the frontend on first login or app load.
    Optionally accepts a ref_code for affiliate tracking.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    claims = await verify_firebase_token(token)
    if claims is None:
        raise UnauthorizedError("Invalid or expired Firebase token")

    user = await sync_user(
        db=db,
        firebase_uid=claims["uid"],
        email=claims.get("email", ""),
        display_name=claims.get("name"),
        photo_url=claims.get("picture"),
        ref_code=body.ref_code if body else None,
        first_name=body.first_name if body else None,
    )

    return user
