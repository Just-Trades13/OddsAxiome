"""Admin-only endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_admin_user
from src.models.affiliate import Affiliate
from src.models.market import Market
from src.models.subscription import Subscription
from src.models.user import User
from src.schemas.user import UserResponse

router = APIRouter()


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    query = select(User).order_by(User.created_at.desc())
    if search:
        query = query.where(
            User.email.ilike(f"%{search}%") | User.display_name.ilike(f"%{search}%")
        )
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)
    result = await db.execute(query)
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.get("/metrics")
async def platform_metrics(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide metrics (admin only)."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_subs = (
        await db.execute(
            select(func.count(Subscription.id)).where(Subscription.status == "active")
        )
    ).scalar() or 0
    total_markets = (
        await db.execute(
            select(func.count(Market.id)).where(Market.status == "active")
        )
    ).scalar() or 0
    total_affiliates = (
        await db.execute(select(func.count(Affiliate.id)))
    ).scalar() or 0

    return {
        "total_users": total_users,
        "active_subscriptions": active_subs,
        "active_markets": total_markets,
        "total_affiliates": total_affiliates,
    }


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    tier: str | None = None,
    is_admin: bool | None = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's tier or admin status (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from src.core.exceptions import NotFoundError
        raise NotFoundError("User not found")

    if tier is not None:
        user.tier = tier
    if is_admin is not None:
        user.is_admin = is_admin

    return UserResponse.model_validate(user)
