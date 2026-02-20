"""Change odds_snapshots.market_id from UUID to String for Redis market IDs.

Revision ID: 002_snapshots_str
Revises: 001_initial
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = "002_snapshots_str"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change market_id from UUID to VARCHAR(300) to store Redis market IDs
    op.alter_column(
        "odds_snapshots",
        "market_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        type_=sa.String(300),
        existing_nullable=False,
        postgresql_using="market_id::text",
    )
    # Add platform_slug column (string like 'kalshi', 'polymarket') alongside integer platform_id
    op.add_column(
        "odds_snapshots",
        sa.Column("platform_slug", sa.String(50), nullable=True),
    )
    # Add sportsbook platforms to replace dead workers
    op.execute("""
        INSERT INTO platforms (slug, name, platform_type, base_url) VALUES
        ('draftkings',  'DraftKings',     'sports', 'https://sportsbook.draftkings.com'),
        ('fanduel',     'FanDuel',        'sports', 'https://sportsbook.fanduel.com'),
        ('betmgm',      'BetMGM',         'sports', 'https://sports.betmgm.com'),
        ('bovada',      'Bovada',         'sports', 'https://www.bovada.lv'),
        ('betrivers',   'BetRivers',      'sports', 'https://www.betrivers.com')
        ON CONFLICT (slug) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_column("odds_snapshots", "platform_slug")
    op.alter_column(
        "odds_snapshots",
        "market_id",
        existing_type=sa.String(300),
        type_=sa.dialects.postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        postgresql_using="market_id::uuid",
    )
