import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, SmallInteger, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, generate_uuid


class ArbOpportunity(Base):
    __tablename__ = "arb_opportunities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    market_title: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    expected_profit: Mapped[float] = mapped_column(Numeric(8, 6), nullable=False)
    total_implied: Mapped[float] = mapped_column(Numeric(8, 6), nullable=False)
    num_outcomes: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    detected_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default="now()", nullable=False)
    expired_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default="now()")

    legs: Mapped[list["ArbLeg"]] = relationship(back_populates="opportunity", cascade="all, delete-orphan")


class ArbLeg(Base):
    __tablename__ = "arb_legs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("arb_opportunities.id"), nullable=False, index=True)
    market_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    platform_id: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome_name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(8, 6), nullable=False)
    implied_prob: Mapped[float] = mapped_column(Numeric(8, 6), nullable=False)
    suggested_stake: Mapped[float | None] = mapped_column(Numeric(10, 2))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default="now()")

    opportunity: Mapped["ArbOpportunity"] = relationship(back_populates="legs")
