"""mercadopago payment flow

Revision ID: 20260511_0008
Revises: 20260511_0007
Create Date: 2026-05-11 18:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260511_0008"
down_revision = "20260511_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # payment_statuses seed table
    op.create_table(
        "payment_statuses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("is_terminal", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
    )
    op.create_index("ix_payment_statuses_code", "payment_statuses", ["code"], unique=True)

    # seed payment statuses
    op.execute("""
        INSERT INTO payment_statuses (id, code, name, description, is_terminal) VALUES
        (1, 'PENDING', 'Pendiente', 'Pago iniciado, esperando confirmación', FALSE),
        (2, 'APPROVED', 'Aprobado', 'Pago aprobado y acreditado', TRUE),
        (3, 'AUTHORIZED', 'Autorizado', 'Pago autorizado pendiente de captura', FALSE),
        (4, 'IN_PROCESS', 'En proceso', 'Pago en proceso de revisión', FALSE),
        (5, 'IN_MEDIATION', 'En mediación', 'Pago en mediación', FALSE),
        (6, 'REJECTED', 'Rechazado', 'Pago rechazado', TRUE),
        (7, 'CANCELLED', 'Cancelado', 'Pago cancelado', TRUE),
        (8, 'REFUNDED', 'Reembolsado', 'Pago reembolsado', TRUE),
        (9, 'CHARGED_BACK', 'Contracargo', 'Pago con contracargo', TRUE),
        (10, 'FAILED', 'Fallido', 'Pago fallido por error técnico', TRUE)
    """)

    # payments table
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payment_method_id", sa.Integer(), sa.ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status_id", sa.Integer(), sa.ForeignKey("payment_statuses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("mp_preference_id", sa.String(255), nullable=True),
        sa.Column("mp_payment_id", sa.String(255), nullable=True),
        sa.Column("mp_merchant_order_id", sa.String(255), nullable=True),
        sa.Column("mp_external_reference", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="ARS"),
        sa.Column("idempotency_key", sa.String(255), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_payments_order_id", "payments", ["order_id"])
    op.create_index("ix_payments_status_id", "payments", ["status_id"])
    op.create_index("ix_payments_mp_payment_id", "payments", ["mp_payment_id"])
    op.create_index("ix_payments_mp_external_reference", "payments", ["mp_external_reference"])
    op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"], unique=True)
    op.create_index("ix_payments_order_status", "payments", ["order_id", "status_id"])
    op.create_index("ix_payments_created_at", "payments", ["created_at"])

    # payment_events table
    op.create_table(
        "payment_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("raw_payload", sa.Text(), nullable=False),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_payment_events_payment_id", "payment_events", ["payment_id"])
    op.create_index("ix_payment_events_payment_created", "payment_events", ["payment_id", "created_at"])


def downgrade() -> None:
    op.drop_table("payment_events")
    op.drop_table("payments")
    op.drop_table("payment_statuses")
