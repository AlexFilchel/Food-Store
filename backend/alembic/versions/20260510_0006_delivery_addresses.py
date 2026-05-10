"""delivery addresses

Revision ID: 20260510_0006
Revises: 20260507_0005
Create Date: 2026-05-10 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260510_0006"
down_revision = "20260507_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "delivery_addresses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("recipient_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("street", sa.String(length=160), nullable=False),
        sa.Column("street_number", sa.String(length=20), nullable=False),
        sa.Column("floor", sa.String(length=20), nullable=True),
        sa.Column("apartment", sa.String(length=20), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("province", sa.String(length=120), nullable=False),
        sa.Column("postal_code", sa.String(length=20), nullable=False),
        sa.Column("reference", sa.String(length=255), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_delivery_addresses_user_id", "delivery_addresses", ["user_id"], unique=False)
    op.create_index("ix_delivery_addresses_deleted_at", "delivery_addresses", ["deleted_at"], unique=False)
    op.create_index("ix_delivery_addresses_user_deleted", "delivery_addresses", ["user_id", "deleted_at"], unique=False)
    op.create_index("ix_delivery_addresses_default_user", "delivery_addresses", ["user_id", "is_default"], unique=False)
    op.create_index(
        "uq_delivery_addresses_default_per_user",
        "delivery_addresses",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND is_default IS TRUE"),
        sqlite_where=sa.text("deleted_at IS NULL AND is_default = 1"),
    )


def downgrade() -> None:
    op.drop_index("uq_delivery_addresses_default_per_user", table_name="delivery_addresses")
    op.drop_index("ix_delivery_addresses_default_user", table_name="delivery_addresses")
    op.drop_index("ix_delivery_addresses_user_deleted", table_name="delivery_addresses")
    op.drop_index("ix_delivery_addresses_deleted_at", table_name="delivery_addresses")
    op.drop_index("ix_delivery_addresses_user_id", table_name="delivery_addresses")
    op.drop_table("delivery_addresses")
