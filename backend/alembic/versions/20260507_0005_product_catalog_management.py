"""product catalog management

Revision ID: 20260507_0005
Revises: 20260506_0004
Create Date: 2026-05-07 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260507_0005"
down_revision = "20260506_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_products_stock_non_negative"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "product_categories",
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("product_id", "category_id"),
    )
    op.create_table(
        "product_ingredients",
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("ingredient_id", sa.Integer(), nullable=False),
        sa.Column("is_removable", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["ingredient_id"], ["ingredients.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("product_id", "ingredient_id"),
    )
    op.create_index("ix_products_deleted_at", "products", ["deleted_at"], unique=False)
    op.create_index("ix_products_is_active", "products", ["is_active"], unique=False)
    op.create_index("ix_products_is_available", "products", ["is_available"], unique=False)
    op.create_index("ix_products_stock_quantity", "products", ["stock_quantity"], unique=False)
    op.create_index("ix_product_categories_product_id", "product_categories", ["product_id"], unique=False)
    op.create_index("ix_product_categories_category_id", "product_categories", ["category_id"], unique=False)
    op.create_index("ix_product_ingredients_product_id", "product_ingredients", ["product_id"], unique=False)
    op.create_index("ix_product_ingredients_ingredient_id", "product_ingredients", ["ingredient_id"], unique=False)
    op.create_index(
        "uq_products_active_slug",
        "products",
        ["slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND is_active IS TRUE"),
        sqlite_where=sa.text("deleted_at IS NULL AND is_active = 1"),
    )


def downgrade() -> None:
    op.drop_index("uq_products_active_slug", table_name="products")
    op.drop_index("ix_product_ingredients_ingredient_id", table_name="product_ingredients")
    op.drop_index("ix_product_ingredients_product_id", table_name="product_ingredients")
    op.drop_index("ix_product_categories_category_id", table_name="product_categories")
    op.drop_index("ix_product_categories_product_id", table_name="product_categories")
    op.drop_index("ix_products_stock_quantity", table_name="products")
    op.drop_index("ix_products_is_available", table_name="products")
    op.drop_index("ix_products_is_active", table_name="products")
    op.drop_index("ix_products_deleted_at", table_name="products")
    op.drop_table("product_ingredients")
    op.drop_table("product_categories")
    op.drop_table("products")
