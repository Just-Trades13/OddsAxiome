import uuid
from datetime import datetime

from pydantic import BaseModel


class AffiliateRegisterResponse(BaseModel):
    code: str
    commission_rate: float

    model_config = {"from_attributes": True}


class AffiliateStatsResponse(BaseModel):
    code: str
    commission_rate: float
    total_clicks: int
    total_conversions: int
    total_earned: float
    total_paid: float
    pending_payout: float


class AffiliateConversionResponse(BaseModel):
    id: int
    user_id: uuid.UUID
    amount: float
    commission: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AffiliateClickRequest(BaseModel):
    landing_page: str | None = None
    user_agent: str | None = None
