"""ingredient management

Revision ID: 20260506_0004
Revises: 20260506_0003
Create Date: 2026-05-06 01:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260506_0004"
down_revision = "20260506_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ingredients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "allergens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "ingredient_allergens",
        sa.Column("ingredient_id", sa.Integer(), nullable=False),
        sa.Column("allergen_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["ingredient_id"], ["ingredients.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["allergen_id"], ["allergens.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("ingredient_id", "allergen_id"),
    )
    op.create_index("ix_ingredient_allergens_ingredient_id", "ingredient_allergens", ["ingredient_id"], unique=False)
    op.create_index("ix_ingredient_allergens_allergen_id", "ingredient_allergens", ["allergen_id"], unique=False)
    op.create_index("ix_ingredients_deleted_at_is_active", "ingredients", ["deleted_at", "is_active"], unique=False)
    op.create_index("ix_allergens_deleted_at_is_active", "allergens", ["deleted_at", "is_active"], unique=False)
    op.create_index(
        "uq_ingredients_active_slug",
        "ingredients",
        ["slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND is_active IS TRUE"),
        sqlite_where=sa.text("deleted_at IS NULL AND is_active = 1"),
    )
    op.create_index(
        "uq_allergens_active_slug",
        "allergens",
        ["slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND is_active IS TRUE"),
        sqlite_where=sa.text("deleted_at IS NULL AND is_active = 1"),
    )


def downgrade() -> None:
    op.drop_index("uq_allergens_active_slug", table_name="allergens")
    op.drop_index("uq_ingredients_active_slug", table_name="ingredients")
    op.drop_index("ix_allergens_deleted_at_is_active", table_name="allergens")
    op.drop_index("ix_ingredients_deleted_at_is_active", table_name="ingredients")
    op.drop_index("ix_ingredient_allergens_allergen_id", table_name="ingredient_allergens")
    op.drop_index("ix_ingredient_allergens_ingredient_id", table_name="ingredient_allergens")
    op.drop_table("ingredient_allergens")
    op.drop_table("allergens")
    op.drop_table("ingredients")
