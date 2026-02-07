"""Market CRUD and search operations."""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.market import Market, Platform


async def get_markets(
    db: AsyncSession,
    category: str | None = None,
    platform_slug: str | None = None,
    status: str = "active",
    search: str | None = None,
    page: int = 1,
    per_page: int = 50,
    sort_by: str = "volume_usd",
) -> tuple[list[Market], int]:
    """Get markets with filtering, search, and pagination."""
    query = select(Market).where(Market.status == status)

    if category:
        query = query.where(Market.category == category)

    if platform_slug:
        platform_q = select(Platform.id).where(Platform.slug == platform_slug)
        query = query.where(Market.platform_id.in_(platform_q))

    if search:
        query = query.where(Market.title.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Sort
    if sort_by == "volume_usd":
        query = query.order_by(Market.volume_usd.desc().nullslast())
    elif sort_by == "created_at":
        query = query.order_by(Market.created_at.desc())
    else:
        query = query.order_by(Market.last_updated_at.desc())

    # Paginate
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    markets = list(result.scalars().all())

    return markets, total


async def get_market_by_id(db: AsyncSession, market_id) -> Market | None:
    result = await db.execute(select(Market).where(Market.id == market_id))
    return result.scalar_one_or_none()


async def get_category_counts(db: AsyncSession) -> list[dict]:
    """Get count of active markets per category."""
    result = await db.execute(
        select(Market.category, func.count(Market.id))
        .where(Market.status == "active")
        .group_by(Market.category)
        .order_by(func.count(Market.id).desc())
    )
    return [{"category": row[0], "count": row[1]} for row in result.all()]


async def get_trending_markets(db: AsyncSession, limit: int = 20) -> list[Market]:
    """Get top markets by volume."""
    result = await db.execute(
        select(Market)
        .where(Market.status == "active")
        .order_by(Market.volume_usd.desc().nullslast())
        .limit(limit)
    )
    return list(result.scalars().all())
