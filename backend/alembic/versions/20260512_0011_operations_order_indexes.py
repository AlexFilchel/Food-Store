"""operations order management indexes

Revision ID: 20260512_0011
Revises: 20260512_0010
Create Date: 2026-05-12 00:20:00.000000
"""

from alembic import op


revision = "20260512_0011"
down_revision = "20260512_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_orders_state_created", "orders", ["state_id", "created_at"])
    op.create_index("ix_payments_order_created", "payments", ["order_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_payments_order_created", table_name="payments")
    op.drop_index("ix_orders_state_created", table_name="orders")
