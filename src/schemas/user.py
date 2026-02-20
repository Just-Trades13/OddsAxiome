import uuid
from datetime import datetime

from pydantic import BaseModel


class UserSyncRequest(BaseModel):
    first_name: str | None = None
    ref_code: str | None = None


class UserUpdateRequest(BaseModel):
    display_name: str | None = None
    photo_url: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    zip: str | None = None
    country_code: str | None = None
    registration_step: str | None = None
    hide_onboarding_tip: bool | None = None
    market_alerts: bool | None = None
    live_data_stream: bool | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    firebase_uid: str
    email: str
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    zip: str | None = None
    country_code: str | None = None
    ip_address: str | None = None
    photo_url: str | None = None
    tier: str
    registration_step: str
    is_admin: bool
    is_active: bool
    hide_onboarding_tip: bool | None = None
    market_alerts: bool | None = None
    live_data_stream: bool | None = None
    last_login_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
