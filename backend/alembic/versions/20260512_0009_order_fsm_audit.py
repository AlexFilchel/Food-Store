"""order fsm audit metadata

Revision ID: 20260512_0009
Revises: 20260511_0008
Create Date: 2026-05-12 00:09:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260512_0009"
down_revision = "20260511_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("order_history", sa.Column("actor_type", sa.String(length=20), nullable=True))
    op.add_column("order_history", sa.Column("source", sa.String(length=40), nullable=True))
    op.add_column("order_history", sa.Column("reason_code", sa.String(length=80), nullable=True))
    op.add_column("order_history", sa.Column("event_key", sa.String(length=255), nullable=True))
    op.create_index(
        "ux_order_history_event_key",
        "order_history",
        ["event_key"],
        unique=True,
        postgresql_where=sa.text("event_key IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ux_order_history_event_key", table_name="order_history")
    op.drop_column("order_history", "event_key")
    op.drop_column("order_history", "reason_code")
    op.drop_column("order_history", "source")
    op.drop_column("order_history", "actor_type")
