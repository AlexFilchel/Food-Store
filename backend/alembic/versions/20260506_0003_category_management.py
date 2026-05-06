"""category management

Revision ID: 20260506_0003
Revises: 20260505_0002
Create Date: 2026-05-06 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260506_0003"
down_revision = "20260505_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"], unique=False)
    op.create_index(
        "ix_categories_deleted_at_parent_id",
        "categories",
        ["deleted_at", "parent_id"],
        unique=False,
    )
    op.create_index(
        "uq_categories_active_parent_slug",
        "categories",
        [sa.text("coalesce(parent_id, -1)"), "slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND is_active IS TRUE"),
        sqlite_where=sa.text("deleted_at IS NULL AND is_active = 1"),
    )


def downgrade() -> None:
    op.drop_index("uq_categories_active_parent_slug", table_name="categories")
    op.drop_index("ix_categories_deleted_at_parent_id", table_name="categories")
    op.drop_index("ix_categories_parent_id", table_name="categories")
    op.drop_table("categories")
