import uuid

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, generate_uuid


class Platform(Base, TimestampMixin):
    __tablename__ = "platforms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    platform_type: Mapped[str] = mapped_column(String(20), nullable=False)  # prediction, sports, crypto
    base_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Market(Base, TimestampMixin):
    __tablename__ = "markets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    external_id: Mapped[str] = mapped_column(String(200), nullable=False)
    platform_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    resolution: Mapped[str | None] = mapped_column(String(20))
    outcomes: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    volume_usd: Mapped[float | None] = mapped_column(Numeric(16, 2))
    liquidity_usd: Mapped[float | None] = mapped_column(Numeric(16, 2))
    end_date: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    first_seen_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default="now()")
    last_updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default="now()")

    __table_args__ = (
        # Unique constraint: one external_id per platform
        {"info": {"unique_together": ("platform_id", "external_id")}},
    )
