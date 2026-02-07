"""Initial schema — all 13 tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-02-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── platforms ──
    op.create_table(
        "platforms",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(50), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("platform_type", sa.String(20), nullable=False),
        sa.Column("base_url", sa.String(500)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── subscription_tiers ──
    op.create_table(
        "subscription_tiers",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(30), unique=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("price_monthly", sa.Numeric(10, 2), nullable=False),
        sa.Column("price_yearly", sa.Numeric(10, 2)),
        sa.Column("stripe_price_id_monthly", sa.String(100)),
        sa.Column("stripe_price_id_yearly", sa.String(100)),
        sa.Column("features", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("max_watchlist", sa.Integer, server_default=sa.text("10")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── users ──
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("firebase_uid", sa.String(128), unique=True, nullable=False, index=True),
        sa.Column("email", sa.String(320), unique=True, nullable=False, index=True),
        sa.Column("display_name", sa.String(200)),
        sa.Column("photo_url", sa.String(1000)),
        sa.Column("hubspot_contact_id", sa.String(50)),
        sa.Column("ref_code_used", sa.String(50)),
        sa.Column("tier", sa.String(20), nullable=False, server_default=sa.text("'free'")),
        sa.Column("is_admin", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── subscriptions ──
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("tier_id", sa.Integer, sa.ForeignKey("subscription_tiers.id"), nullable=False),
        sa.Column("stripe_customer_id", sa.String(100)),
        sa.Column("stripe_subscription_id", sa.String(100), unique=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("current_period_start", sa.DateTime(timezone=True)),
        sa.Column("current_period_end", sa.DateTime(timezone=True)),
        sa.Column("cancel_at_period_end", sa.Boolean, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── affiliates ──
    op.create_table(
        "affiliates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True, nullable=False),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("commission_rate", sa.Numeric(5, 4), nullable=False, server_default=sa.text("0.15")),
        sa.Column("total_earned", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("total_paid", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── affiliate_clicks ──
    op.create_table(
        "affiliate_clicks",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("affiliate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("affiliates.id"), nullable=False, index=True),
        sa.Column("ip_hash", sa.String(64)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("landing_page", sa.String(1000)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── affiliate_conversions ──
    op.create_table(
        "affiliate_conversions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("affiliate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("affiliates.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id")),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("commission", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── affiliate_payouts ──
    op.create_table(
        "affiliate_payouts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("affiliate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("affiliates.id"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("method", sa.String(30)),
        sa.Column("reference", sa.String(200)),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── markets ──
    op.create_table(
        "markets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("external_id", sa.String(200), nullable=False),
        sa.Column("platform_id", sa.Integer, nullable=False, index=True),
        sa.Column("category", sa.String(30), nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("url", sa.String(1000)),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'active'"), index=True),
        sa.Column("resolution", sa.String(20)),
        sa.Column("outcomes", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("volume_usd", sa.Numeric(16, 2)),
        sa.Column("liquidity_usd", sa.Numeric(16, 2)),
        sa.Column("end_date", sa.DateTime(timezone=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── odds_snapshots ──
    op.create_table(
        "odds_snapshots",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("market_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("platform_id", sa.Integer, nullable=False),
        sa.Column("outcome_index", sa.SmallInteger, nullable=False),
        sa.Column("outcome_name", sa.String(200), nullable=False),
        sa.Column("price", sa.Numeric(8, 6), nullable=False),
        sa.Column("implied_prob", sa.Numeric(8, 6), nullable=False),
        sa.Column("bid", sa.Numeric(8, 6)),
        sa.Column("ask", sa.Numeric(8, 6)),
        sa.Column("volume_24h", sa.Numeric(16, 2)),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
    )

    # ── arb_opportunities ──
    op.create_table(
        "arb_opportunities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("market_title", sa.String(500), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("expected_profit", sa.Numeric(8, 6), nullable=False),
        sa.Column("total_implied", sa.Numeric(8, 6), nullable=False),
        sa.Column("num_outcomes", sa.SmallInteger, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'active'"), index=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expired_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── arb_legs ──
    op.create_table(
        "arb_legs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("opportunity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("arb_opportunities.id"), nullable=False, index=True),
        sa.Column("market_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("platform_id", sa.Integer, nullable=False),
        sa.Column("outcome_name", sa.String(200), nullable=False),
        sa.Column("price", sa.Numeric(8, 6), nullable=False),
        sa.Column("implied_prob", sa.Numeric(8, 6), nullable=False),
        sa.Column("suggested_stake", sa.Numeric(10, 2)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── user_events ──
    op.create_table(
        "user_events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), index=True),
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("event_data", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ip_hash", sa.String(64)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("session_id", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── Seed platforms ──
    op.execute("""
        INSERT INTO platforms (slug, name, platform_type, base_url) VALUES
        ('polymarket',  'Polymarket',     'prediction', 'https://polymarket.com'),
        ('kalshi',      'Kalshi',         'prediction', 'https://kalshi.com'),
        ('predictit',   'PredictIt',      'prediction', 'https://www.predictit.org'),
        ('theoddsapi',  'The Odds API',   'sports',     'https://the-odds-api.com'),
        ('gemini',      'Gemini',         'crypto',     'https://www.gemini.com'),
        ('coinbase',    'Coinbase',       'crypto',     'https://www.coinbase.com'),
        ('robinhood',   'Robinhood',      'prediction', 'https://robinhood.com'),
        ('limitless',   'Limitless',      'prediction', 'https://limitless.exchange')
        ON CONFLICT (slug) DO NOTHING;
    """)

    # ── Seed subscription tiers ──
    op.execute("""
        INSERT INTO subscription_tiers (slug, name, price_monthly, price_yearly, features, max_watchlist) VALUES
        ('free',     'Free',          0,    0,    '{"dashboard": true}'::jsonb,                                                                    5),
        ('explorer', 'Explorer',      49,   468,  '{"dashboard": true, "arb_scanning": true, "filters": true, "daily_scans": 15}'::jsonb,         20),
        ('pro',      'Arbitrage Pro', 149,  1428, '{"dashboard": true, "arb_scanning": true, "filters": true, "daily_scans": -1, "gemini_verify": true, "priority_refresh": true, "time_lock": true, "roi_calculator": true, "custom_columns": true}'::jsonb, 100)
        ON CONFLICT (slug) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_table("user_events")
    op.drop_table("arb_legs")
    op.drop_table("arb_opportunities")
    op.drop_table("odds_snapshots")
    op.drop_table("markets")
    op.drop_table("affiliate_payouts")
    op.drop_table("affiliate_conversions")
    op.drop_table("affiliate_clicks")
    op.drop_table("affiliates")
    op.drop_table("subscriptions")
    op.drop_table("users")
    op.drop_table("subscription_tiers")
    op.drop_table("platforms")
