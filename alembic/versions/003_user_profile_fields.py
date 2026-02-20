"""Add profile fields to users table for magic-link signup flow.

Revision ID: 003_user_profile
Revises: 002_snapshots_str
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = "003_user_profile"
down_revision = "002_snapshots_str"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(100)))
    op.add_column("users", sa.Column("last_name", sa.String(100)))
    op.add_column("users", sa.Column("phone", sa.String(30)))
    op.add_column("users", sa.Column("zip", sa.String(20)))
    op.add_column("users", sa.Column("country_code", sa.String(10)))
    op.add_column("users", sa.Column("ip_address", sa.String(50)))
    op.add_column(
        "users",
        sa.Column(
            "registration_step",
            sa.String(20),
            server_default="complete",
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("hide_onboarding_tip", sa.Boolean(), server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("market_alerts", sa.Boolean(), server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("live_data_stream", sa.Boolean(), server_default="false"),
    )

    # Backfill first_name from display_name for existing users
    op.execute(
        "UPDATE users SET first_name = split_part(display_name, ' ', 1) "
        "WHERE display_name IS NOT NULL AND first_name IS NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "live_data_stream")
    op.drop_column("users", "market_alerts")
    op.drop_column("users", "hide_onboarding_tip")
    op.drop_column("users", "registration_step")
    op.drop_column("users", "ip_address")
    op.drop_column("users", "country_code")
    op.drop_column("users", "zip")
    op.drop_column("users", "phone")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
