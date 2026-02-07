import uuid
from datetime import datetime

from pydantic import BaseModel


class MarketResponse(BaseModel):
    id: uuid.UUID
    external_id: str
    platform_id: int
    platform_slug: str | None = None
    category: str
    title: str
    description: str | None
    url: str | None
    status: str
    resolution: str | None
    outcomes: list[dict]
    volume_usd: float | None
    liquidity_usd: float | None
    end_date: datetime | None
    last_updated_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MarketListParams(BaseModel):
    category: str | None = None
    platform: str | None = None
    status: str = "active"
    search: str | None = None
    page: int = 1
    per_page: int = 50
    sort_by: str = "volume_usd"


class CategoryCountResponse(BaseModel):
    category: str
    count: int
