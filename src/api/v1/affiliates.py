"""Affiliate program endpoints."""
from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.schemas.affiliate import (
    AffiliateClickRequest,
    AffiliateConversionResponse,
    AffiliateRegisterResponse,
    AffiliateStatsResponse,
)
from src.schemas.common import SuccessResponse
from src.services.affiliate_service import (
    get_affiliate_conversions,
    get_affiliate_stats,
    register_affiliate,
    track_click,
)

router = APIRouter()


@router.post("/register", response_model=AffiliateRegisterResponse)
async def register(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register as an affiliate and get your unique referral code."""
    affiliate = await register_affiliate(db, user.id)
    return AffiliateRegisterResponse(
        code=affiliate.code,
        commission_rate=float(affiliate.commission_rate),
    )


@router.get("/stats", response_model=AffiliateStatsResponse)
async def stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get affiliate dashboard stats — clicks, conversions, earnings."""
    data = await get_affiliate_stats(db, user.id)
    return AffiliateStatsResponse(**data)


@router.get("/conversions", response_model=list[AffiliateConversionResponse])
async def conversions(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed conversion history."""
    items = await get_affiliate_conversions(db, user.id, page=page, per_page=per_page)
    return [AffiliateConversionResponse.model_validate(c) for c in items]


@router.post("/click/{code}", response_model=SuccessResponse)
async def click(
    code: str,
    request: Request,
    body: AffiliateClickRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Track an affiliate link click. No auth required."""
    ip = request.client.host if request.client else None
    ua = body.user_agent if body else request.headers.get("user-agent")
    lp = body.landing_page if body else None

    found = await track_click(db, code, ip_address=ip, user_agent=ua, landing_page=lp)
    return SuccessResponse(success=found, message="Click tracked" if found else "Invalid code")
