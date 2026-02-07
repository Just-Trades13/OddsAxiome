import uuid
from datetime import datetime

from pydantic import BaseModel


class ArbLegResponse(BaseModel):
    platform_id: int
    platform_slug: str | None = None
    market_id: uuid.UUID
    outcome_name: str
    price: float
    implied_prob: float
    suggested_stake: float | None

    model_config = {"from_attributes": True}


class ArbOpportunityResponse(BaseModel):
    id: uuid.UUID
    market_title: str
    category: str
    expected_profit: float
    total_implied: float
    num_outcomes: int
    status: str
    detected_at: datetime
    legs: list[ArbLegResponse] = []

    model_config = {"from_attributes": True}
