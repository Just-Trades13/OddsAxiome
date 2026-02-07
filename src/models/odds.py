import uuid

from sqlalchemy import DateTime, Integer, Numeric, SmallInteger, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class OddsSnapshot(Base):
    __tablename__ = "odds_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    market_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    platform_id: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome_index: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    outcome_name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(8, 6), nullable=False)
    implied_prob: Mapped[float] = mapped_column(Numeric(8, 6), nullable=False)
    bid: Mapped[float | None] = mapped_column(Numeric(8, 6))
    ask: Mapped[float | None] = mapped_column(Numeric(8, 6))
    volume_24h: Mapped[float | None] = mapped_column(Numeric(16, 2))
    captured_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default="now()", nullable=False, index=True)
