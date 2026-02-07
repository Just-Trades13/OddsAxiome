import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserSyncRequest(BaseModel):
    ref_code: str | None = None


class UserUpdateRequest(BaseModel):
    display_name: str | None = None
    photo_url: str | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    firebase_uid: str
    email: str
    display_name: str | None
    photo_url: str | None
    tier: str
    is_admin: bool
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
