import uuid
from datetime import datetime

from pydantic import BaseModel


class LiveOddsOutcome(BaseModel):
    outcome_index: int
    outcome_name: str
    price: float
    implied_prob: float
    bid: float | None = None
    ask: float | None = None


class LiveOddsPlatform(BaseModel):
    platform_slug: str
    platform_name: str
    outcomes: list[LiveOddsOutcome]
    volume_24h: float | None = None
    updated_at: str | None = None


class LiveOddsResponse(BaseModel):
    market_id: uuid.UUID
    market_title: str
    category: str
    platforms: list[LiveOddsPlatform]
    best_yes: LiveOddsOutcome | None = None
    best_no: LiveOddsOutcome | None = None


class OddsHistoryPoint(BaseModel):
    captured_at: datetime
    price: float
    implied_prob: float
    platform_id: int


class OddsHistoryResponse(BaseModel):
    market_id: uuid.UUID
    outcome_name: str
    data_points: list[OddsHistoryPoint]
