import uuid
from datetime import datetime

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    tier_slug: str  # 'explorer' or 'pro'
    interval: str = "monthly"  # 'monthly' or 'yearly'


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionStatusResponse(BaseModel):
    tier: str
    status: str | None  # active, past_due, canceled, trialing, None if free
    current_period_end: datetime | None
    cancel_at_period_end: bool

    model_config = {"from_attributes": True}


class TierResponse(BaseModel):
    id: int
    slug: str
    name: str
    price_monthly: float
    price_yearly: float | None
    features: dict
    max_watchlist: int

    model_config = {"from_attributes": True}
