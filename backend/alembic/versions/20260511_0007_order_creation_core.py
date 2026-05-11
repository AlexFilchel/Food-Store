"""order creation core

Revision ID: 20260511_0007
Revises: 20260510_0006
Create Date: 2026-05-11 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260511_0007"
down_revision = "20260510_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("state_id", sa.Integer(), sa.ForeignKey("order_states.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payment_method_id", sa.Integer(), sa.ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("order_number", sa.String(30), nullable=False),
        sa.Column("delivery_recipient_name", sa.String(120), nullable=False),
        sa.Column("delivery_phone", sa.String(40), nullable=False),
        sa.Column("delivery_street", sa.String(160), nullable=False),
        sa.Column("delivery_street_number", sa.String(20), nullable=False),
        sa.Column("delivery_floor", sa.String(20), nullable=True),
        sa.Column("delivery_apartment", sa.String(20), nullable=True),
        sa.Column("delivery_city", sa.String(120), nullable=False),
        sa.Column("delivery_province", sa.String(120), nullable=False),
        sa.Column("delivery_postal_code", sa.String(20), nullable=False),
        sa.Column("delivery_reference", sa.String(255), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_index("ix_orders_state_id", "orders", ["state_id"])
    op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)
    op.create_index("ix_orders_user_state", "orders", ["user_id", "state_id"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("product_name", sa.String(160), nullable=False),
        sa.Column("product_slug", sa.String(180), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("removed_ingredients", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    op.create_table(
        "order_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_state_id", sa.Integer(), sa.ForeignKey("order_states.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("to_state_id", sa.Integer(), sa.ForeignKey("order_states.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_order_history_order_id", "order_history", ["order_id"])
    op.create_index("ix_order_history_order_created", "order_history", ["order_id", "created_at"])


def downgrade() -> None:
    op.drop_table("order_history")
    op.drop_table("order_items")
    op.drop_table("orders")
