"""Webhook endpoints — Stripe. No Firebase auth on these routes."""
import stripe
import structlog
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.exceptions import BadRequestError
from src.services.stripe_service import handle_webhook_event

logger = structlog.get_logger()

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    Uses raw request body + Stripe signature for verification.
    NO Firebase auth — Stripe authenticates via signing secret.
    """
    if not stripe_signature:
        raise BadRequestError("Missing Stripe-Signature header")

    body = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=body,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except stripe.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise BadRequestError("Invalid signature")
    except ValueError:
        logger.warning("Stripe webhook invalid payload")
        raise BadRequestError("Invalid payload")

    await handle_webhook_event(db, event)

    return {"received": True}
