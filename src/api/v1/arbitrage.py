"""Arbitrage opportunity endpoints."""
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import TierGate
from src.core.exceptions import NotFoundError
from src.core.redis import get_redis
from src.models.arbitrage import ArbLeg, ArbOpportunity
from src.models.user import User
from src.schemas.arbitrage import ArbOpportunityResponse

router = APIRouter()


@router.get("/opportunities", response_model=list[ArbOpportunityResponse])
async def list_arb_opportunities(
    category: str | None = None,
    min_profit: float = Query(0.0, ge=0.0),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(TierGate("pro")),
    db: AsyncSession = Depends(get_db),
):
    """Get active arbitrage opportunities. Requires Pro tier."""
    query = (
        select(ArbOpportunity)
        .where(ArbOpportunity.status == "active")
        .order_by(ArbOpportunity.expected_profit.desc())
    )

    if category:
        query = query.where(ArbOpportunity.category == category)

    if min_profit > 0:
        query = query.where(ArbOpportunity.expected_profit >= min_profit)

    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    opportunities = result.scalars().all()

    # Load legs for each opportunity
    responses = []
    for opp in opportunities:
        legs_result = await db.execute(
            select(ArbLeg).where(ArbLeg.opportunity_id == opp.id)
        )
        legs = legs_result.scalars().all()
        resp = ArbOpportunityResponse.model_validate(opp)
        resp.legs = [
            {"platform_id": l.platform_id, "market_id": l.market_id,
             "outcome_name": l.outcome_name, "price": float(l.price),
             "implied_prob": float(l.implied_prob), "suggested_stake": float(l.suggested_stake) if l.suggested_stake else None}
            for l in legs
        ]
        responses.append(resp)

    return responses


@router.get("/opportunities/{opp_id}", response_model=ArbOpportunityResponse)
async def get_arb_opportunity(
    opp_id: str,
    user: User = Depends(TierGate("pro")),
    db: AsyncSession = Depends(get_db),
):
    """Get a single arbitrage opportunity with all legs."""
    result = await db.execute(select(ArbOpportunity).where(ArbOpportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise NotFoundError("Arbitrage opportunity not found")

    legs_result = await db.execute(select(ArbLeg).where(ArbLeg.opportunity_id == opp.id))
    legs = legs_result.scalars().all()

    resp = ArbOpportunityResponse.model_validate(opp)
    resp.legs = [
        {"platform_id": l.platform_id, "market_id": l.market_id,
         "outcome_name": l.outcome_name, "price": float(l.price),
         "implied_prob": float(l.implied_prob), "suggested_stake": float(l.suggested_stake) if l.suggested_stake else None}
        for l in legs
    ]
    return resp
