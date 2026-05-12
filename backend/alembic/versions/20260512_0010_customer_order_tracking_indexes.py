"""customer order tracking indexes

Revision ID: 20260512_0010
Revises: 20260512_0009
Create Date: 2026-05-12 00:10:00.000000
"""

from alembic import op


revision = "20260512_0010"
down_revision = "20260512_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_orders_user_created_desc", "orders", ["user_id", "created_at"])
    op.create_index("ix_orders_user_state_created", "orders", ["user_id", "state_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_orders_user_state_created", table_name="orders")
    op.drop_index("ix_orders_user_created_desc", table_name="orders")
