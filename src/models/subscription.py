import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, generate_uuid


class SubscriptionTier(Base, TimestampMixin):
    __tablename__ = "subscription_tiers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    price_monthly: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_yearly: Mapped[float | None] = mapped_column(Numeric(10, 2))
    stripe_price_id_monthly: Mapped[str | None] = mapped_column(String(100))
    stripe_price_id_yearly: Mapped[str | None] = mapped_column(String(100))
    features: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    max_watchlist: Mapped[int] = mapped_column(Integer, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    tier_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscription_tiers.id"), nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # active, past_due, canceled, trialing
    current_period_start: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="subscription")
    tier: Mapped["SubscriptionTier"] = relationship()
