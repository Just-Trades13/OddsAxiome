"""Subscription and payment endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    PortalResponse,
    SubscriptionStatusResponse,
)
from src.services.stripe_service import create_checkout_session, create_portal_session

router = APIRouter()


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout session for a subscription tier."""
    result = await create_checkout_session(db, user, body.tier_slug, body.interval)
    return CheckoutResponse(**result)


@router.get("/status", response_model=SubscriptionStatusResponse)
async def subscription_status(user: User = Depends(get_current_user)):
    """Get current subscription status."""
    sub = user.subscription
    return SubscriptionStatusResponse(
        tier=user.tier,
        status=sub.status if sub else None,
        current_period_end=sub.current_period_end if sub else None,
        cancel_at_period_end=sub.cancel_at_period_end if sub else False,
    )


@router.post("/portal", response_model=PortalResponse)
async def customer_portal(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session for self-service management."""
    result = await create_portal_session(db, user)
    return PortalResponse(**result)
