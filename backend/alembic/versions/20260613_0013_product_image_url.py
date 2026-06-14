"""add image_url to products

Revision ID: 20260613_0013
Revises: 20260517_0012
Create Date: 2026-06-13 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260613_0013"
down_revision = "20260517_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("image_url", sa.VARCHAR(500), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "image_url")
