"""Affiliate program service — registration, click tracking, conversions."""
import hashlib
import secrets

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.affiliate import Affiliate, AffiliateClick, AffiliateConversion


def generate_affiliate_code() -> str:
    """Generate a unique 8-character affiliate code."""
    return secrets.token_urlsafe(6)  # ~8 chars


async def register_affiliate(db: AsyncSession, user_id) -> Affiliate:
    """Register a user as an affiliate."""
    # Check if already registered
    existing = await db.execute(select(Affiliate).where(Affiliate.user_id == user_id))
    affiliate = existing.scalar_one_or_none()
    if affiliate:
        return affiliate

    affiliate = Affiliate(
        user_id=user_id,
        code=generate_affiliate_code(),
        commission_rate=0.15,
    )
    db.add(affiliate)
    await db.flush()
    return affiliate


async def track_click(
    db: AsyncSession,
    code: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    landing_page: str | None = None,
) -> bool:
    """Track an affiliate link click. Returns True if affiliate found."""
    result = await db.execute(select(Affiliate).where(Affiliate.code == code))
    affiliate = result.scalar_one_or_none()
    if not affiliate:
        return False

    ip_hash = hashlib.sha256(ip_address.encode()).hexdigest() if ip_address else None

    click = AffiliateClick(
        affiliate_id=affiliate.id,
        ip_hash=ip_hash,
        user_agent=user_agent[:500] if user_agent else None,
        landing_page=landing_page[:1000] if landing_page else None,
    )
    db.add(click)
    return True


async def get_affiliate_stats(db: AsyncSession, user_id) -> dict:
    """Get affiliate dashboard statistics."""
    result = await db.execute(select(Affiliate).where(Affiliate.user_id == user_id))
    affiliate = result.scalar_one_or_none()
    if not affiliate:
        return {"error": "Not registered as affiliate"}

    # Click count
    clicks_result = await db.execute(
        select(func.count(AffiliateClick.id)).where(AffiliateClick.affiliate_id == affiliate.id)
    )
    total_clicks = clicks_result.scalar() or 0

    # Conversion count
    conv_result = await db.execute(
        select(func.count(AffiliateConversion.id)).where(
            AffiliateConversion.affiliate_id == affiliate.id
        )
    )
    total_conversions = conv_result.scalar() or 0

    return {
        "code": affiliate.code,
        "commission_rate": float(affiliate.commission_rate),
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "total_earned": float(affiliate.total_earned),
        "total_paid": float(affiliate.total_paid),
        "pending_payout": float(affiliate.total_earned - affiliate.total_paid),
    }


async def get_affiliate_conversions(
    db: AsyncSession, user_id, page: int = 1, per_page: int = 50
) -> list[AffiliateConversion]:
    """Get affiliate's conversion history."""
    result = await db.execute(select(Affiliate).where(Affiliate.user_id == user_id))
    affiliate = result.scalar_one_or_none()
    if not affiliate:
        return []

    offset = (page - 1) * per_page
    conv_result = await db.execute(
        select(AffiliateConversion)
        .where(AffiliateConversion.affiliate_id == affiliate.id)
        .order_by(AffiliateConversion.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    return list(conv_result.scalars().all())
