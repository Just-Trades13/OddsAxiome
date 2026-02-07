"""Admin-only endpoints."""
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_admin_user
from src.core.redis import get_redis
from src.models.affiliate import Affiliate
from src.models.market import Market
from src.models.subscription import Subscription
from src.models.user import User
from src.schemas.user import UserResponse

router = APIRouter()


class AdminUserUpdate(BaseModel):
    tier: str | None = None
    is_admin: bool | None = None
    is_active: bool | None = None


@router.get("/users")
async def list_users(
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only). Returns paginated data + total count."""
    base_query = select(User)
    if search:
        base_query = base_query.where(
            User.email.ilike(f"%{search}%") | User.display_name.ilike(f"%{search}%")
        )

    # Total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginated results
    offset = (page - 1) * per_page
    query = base_query.order_by(User.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(query)
    users = [UserResponse.model_validate(u) for u in result.scalars().all()]

    return {
        "data": users,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }


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
    body: AdminUserUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's tier, admin status, or active flag (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from src.core.exceptions import NotFoundError
        raise NotFoundError("User not found")

    if body.tier is not None:
        user.tier = body.tier
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user (admin only). Sets is_active=False."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from src.core.exceptions import NotFoundError
        raise NotFoundError("User not found")

    user.is_active = False
    await db.commit()
    return {"detail": "User deactivated", "user_id": user_id}


@router.get("/ingestion/status")
async def ingestion_status(
    admin: User = Depends(get_admin_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get live ingestion status — counts per platform from Redis."""
    platforms: dict[str, int] = {}
    total_keys = 0

    async for key in redis.scan_iter(match="odds:live:*", count=500):
        key_str = key if isinstance(key, str) else key.decode()
        total_keys += 1
        # Key format: odds:live:{platform}:{market_id}
        parts = key_str.split(":", 3)
        if len(parts) >= 3:
            platform = parts[2]
            platforms[platform] = platforms.get(platform, 0) + 1

    return {
        "total_keys": total_keys,
        "platforms": dict(sorted(platforms.items(), key=lambda x: -x[1])),
    }
