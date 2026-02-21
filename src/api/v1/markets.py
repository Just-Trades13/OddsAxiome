"""Market browsing and search endpoints.

The PostgreSQL markets table is not yet populated — all live data comes from
Redis via the /odds endpoints.  These endpoints query PostgreSQL and will
return empty results until a backfill is implemented.  The /{market_id}
endpoint gracefully returns 404 instead of crashing on invalid UUIDs.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_optional_user
from src.core.exceptions import NotFoundError
from src.schemas.common import PaginatedResponse, PaginationMeta
from src.schemas.market import CategoryCountResponse, MarketResponse
from src.services.market_service import (
    get_category_counts,
    get_market_by_id,
    get_markets,
    get_trending_markets,
)

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_markets(
    category: str | None = None,
    platform: str | None = None,
    status: str = "active",
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    sort_by: str = "volume_usd",
    db: AsyncSession = Depends(get_db),
):
    """List markets with filtering, search, and pagination."""
    markets, total = await get_markets(
        db, category=category, platform_slug=platform, status=status,
        search=search, page=page, per_page=per_page, sort_by=sort_by,
    )
    total_pages = (total + per_page - 1) // per_page if per_page else 1

    return PaginatedResponse(
        data=[MarketResponse.model_validate(m) for m in markets],
        meta=PaginationMeta(page=page, per_page=per_page, total=total, total_pages=total_pages),
    )


@router.get("/categories", response_model=list[CategoryCountResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get available categories with market counts."""
    return await get_category_counts(db)


@router.get("/trending", response_model=list[MarketResponse])
async def trending_markets(db: AsyncSession = Depends(get_db)):
    """Get top 20 markets by volume."""
    markets = await get_trending_markets(db)
    return [MarketResponse.model_validate(m) for m in markets]


@router.get("/{market_id}")
async def get_market(market_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single market by ID."""
    # Validate UUID format to prevent SQLAlchemy crash
    try:
        UUID(market_id)
    except (ValueError, AttributeError):
        raise NotFoundError("Market not found")

    market = await get_market_by_id(db, market_id)
    if not market:
        raise NotFoundError("Market not found")
    return MarketResponse.model_validate(market)
