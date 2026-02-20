"""Notification endpoints — arb alerts and system notifications."""
import orjson
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from src.core.dependencies import get_current_user
from src.core.redis import get_redis
from src.models.user import User

router = APIRouter()

@router.get("")
async def get_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Get user's notifications from Redis. Stores last 50 per user."""
    key = f"notifications:{user.id}"
    # Get notifications from Redis list (newest first)
    start = (page - 1) * per_page
    end = start + per_page - 1
    raw_items = await redis.lrange(key, start, end)
    total = await redis.llen(key)

    notifications = []
    for raw in raw_items:
        try:
            notifications.append(orjson.loads(raw))
        except Exception:
            continue

    return {
        "data": notifications,
        "meta": {"page": page, "per_page": per_page, "total": total},
        "unread_count": await redis.get(f"notifications:{user.id}:unread") or 0,
    }

@router.post("/read")
async def mark_all_read(
    user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Mark all notifications as read."""
    await redis.set(f"notifications:{user.id}:unread", 0)
    return {"success": True}

@router.delete("")
async def clear_notifications(
    user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Clear all notifications for the user."""
    await redis.delete(f"notifications:{user.id}")
    await redis.delete(f"notifications:{user.id}:unread")
    return {"success": True}
