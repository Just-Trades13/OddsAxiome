"""Stripe payment integration — checkout sessions, webhooks, subscription management."""
import stripe
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.affiliate import Affiliate, AffiliateConversion
from src.models.subscription import Subscription, SubscriptionTier
from src.models.user import User

logger = structlog.get_logger()

stripe.api_key = settings.stripe_secret_key

# Map tier slugs to Stripe price IDs
PRICE_MAP = {
    ("explorer", "monthly"): settings.stripe_price_id_explorer_monthly,
    ("explorer", "yearly"): settings.stripe_price_id_explorer_yearly,
    ("pro", "monthly"): settings.stripe_price_id_pro_monthly,
    ("pro", "yearly"): settings.stripe_price_id_pro_yearly,
}


async def create_checkout_session(
    db: AsyncSession, user: User, tier_slug: str, interval: str = "monthly"
) -> dict:
    """Create a Stripe Checkout session for a subscription."""
    price_id = PRICE_MAP.get((tier_slug, interval))
    if not price_id:
        raise ValueError(f"No Stripe price configured for {tier_slug}/{interval}")

    # Get or create Stripe customer
    customer_id = None
    if user.subscription and user.subscription.stripe_customer_id:
        customer_id = user.subscription.stripe_customer_id

    if not customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.display_name or "",
            metadata={"user_id": str(user.id), "firebase_uid": user.firebase_uid},
        )
        customer_id = customer.id

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={"trial_period_days": 7},
        success_url=f"{settings.frontend_url}/membership?success=true&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_url}/membership?canceled=true",
        metadata={"user_id": str(user.id), "tier_slug": tier_slug},
    )

    return {"checkout_url": session.url, "session_id": session.id}


async def create_portal_session(db: AsyncSession, user: User) -> dict:
    """Create a Stripe Customer Portal session for managing subscriptions."""
    if not user.subscription or not user.subscription.stripe_customer_id:
        raise ValueError("No active subscription to manage")

    session = stripe.billing_portal.Session.create(
        customer=user.subscription.stripe_customer_id,
        return_url=f"{settings.frontend_url}/membership",
    )

    return {"portal_url": session.url}


async def handle_webhook_event(db: AsyncSession, event: dict) -> None:
    """Process a Stripe webhook event."""
    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    logger.info("Stripe webhook received", event_type=event_type)

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, data)


async def _handle_checkout_completed(db: AsyncSession, session_data: dict) -> None:
    """Handle successful checkout — create/update subscription record."""
    user_id = session_data.get("metadata", {}).get("user_id")
    tier_slug = session_data.get("metadata", {}).get("tier_slug", "pro")
    customer_id = session_data.get("customer")
    subscription_id = session_data.get("subscription")

    if not user_id:
        logger.warning("Checkout completed without user_id in metadata")
        return

    # Look up tier
    tier_result = await db.execute(
        select(SubscriptionTier).where(SubscriptionTier.slug == tier_slug)
    )
    tier = tier_result.scalar_one_or_none()
    if not tier:
        logger.error("Unknown tier slug in checkout", tier_slug=tier_slug)
        return

    # Look up user
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        logger.error("User not found for checkout", user_id=user_id)
        return

    # Create or update subscription
    existing = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    sub = existing.scalar_one_or_none()

    # Read actual subscription status from Stripe (will be "trialing" for trial subs)
    actual_status = "active"
    if subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription_id)
            actual_status = stripe_sub.status  # "trialing", "active", etc.
        except Exception:
            pass

    if sub:
        sub.tier_id = tier.id
        sub.stripe_customer_id = customer_id
        sub.stripe_subscription_id = subscription_id
        sub.status = actual_status
    else:
        sub = Subscription(
            user_id=user.id,
            tier_id=tier.id,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
            status=actual_status,
        )
        db.add(sub)

    # Update user tier
    user.tier = tier_slug
    logger.info("Subscription activated", user_id=user_id, tier=tier_slug)

    # Record affiliate conversion if this user was referred
    if user.ref_code_used:
        try:
            aff_result = await db.execute(
                select(Affiliate).where(Affiliate.code == user.ref_code_used, Affiliate.is_active == True)
            )
            affiliate = aff_result.scalar_one_or_none()
            if affiliate:
                amount = float(tier.price_monthly)
                commission = amount * float(affiliate.commission_rate)
                conversion = AffiliateConversion(
                    affiliate_id=affiliate.id,
                    user_id=user.id,
                    subscription_id=sub.id,
                    amount=amount,
                    commission=commission,
                    status="pending",
                )
                db.add(conversion)
                affiliate.total_earned = float(affiliate.total_earned) + commission
                logger.info(
                    "Affiliate conversion recorded",
                    affiliate_code=user.ref_code_used,
                    user_id=user_id,
                    commission=commission,
                )
        except Exception as e:
            logger.error("Failed to record affiliate conversion", error=str(e))


async def _handle_subscription_updated(db: AsyncSession, sub_data: dict) -> None:
    """Handle subscription status changes."""
    stripe_sub_id = sub_data.get("id")
    status = sub_data.get("status", "")

    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return

    sub.status = status
    sub.cancel_at_period_end = sub_data.get("cancel_at_period_end", False)

    # Trialing users get the same tier access as active
    # If canceled, revert user to free tier
    if status in ("canceled", "unpaid"):
        user_result = await db.execute(select(User).where(User.id == sub.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.tier = "free"


async def _handle_subscription_deleted(db: AsyncSession, sub_data: dict) -> None:
    """Handle subscription cancellation."""
    await _handle_subscription_updated(db, {**sub_data, "status": "canceled"})


async def _handle_payment_failed(db: AsyncSession, invoice_data: dict) -> None:
    """Handle failed payment — mark subscription as past_due."""
    stripe_sub_id = invoice_data.get("subscription")
    if not stripe_sub_id:
        return

    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "past_due"
