"""system configuration core tables

Revision ID: 20260517_0012
Revises: 20260512_0011
Create Date: 2026-05-17 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260517_0012"
down_revision = "20260512_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_configuration_values",
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("key"),
    )

    op.create_table(
        "system_configuration_audit",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("old_value_json", sa.JSON(), nullable=True),
        sa.Column("new_value_json", sa.JSON(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("request_id", sa.String(length=120), nullable=True),
        sa.Column("changed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_system_configuration_audit_key", "system_configuration_audit", ["key"], unique=False)
    op.create_index("ix_system_configuration_audit_request_id", "system_configuration_audit", ["request_id"], unique=False)
    op.create_index("ix_system_configuration_audit_changed_by_user_id", "system_configuration_audit", ["changed_by_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_system_configuration_audit_changed_by_user_id", table_name="system_configuration_audit")
    op.drop_index("ix_system_configuration_audit_request_id", table_name="system_configuration_audit")
    op.drop_index("ix_system_configuration_audit_key", table_name="system_configuration_audit")
    op.drop_table("system_configuration_audit")
    op.drop_table("system_configuration_values")
