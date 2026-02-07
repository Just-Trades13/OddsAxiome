import uuid

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, generate_uuid


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(200))
    photo_url: Mapped[str | None] = mapped_column(String(1000))
    hubspot_contact_id: Mapped[str | None] = mapped_column(String(50))
    ref_code_used: Mapped[str | None] = mapped_column(String(50))
    tier: Mapped[str] = mapped_column(String(20), default="free", nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))

    subscription: Mapped["Subscription"] = relationship(back_populates="user", uselist=False, lazy="selectin")
    affiliate: Mapped["Affiliate"] = relationship(back_populates="user", uselist=False, lazy="selectin")
