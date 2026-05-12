import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin
from app.core.time import utc_now


class PaymentMethod(AuditMixin, table=True):
    __tablename__ = "payment_methods"

    id: int = Field(primary_key=True)
    code: str = Field(sa_column=Column(String(50), unique=True, nullable=False, index=True))
    name: str = Field(sa_column=Column(String(100), nullable=False))
    description: str = Field(sa_column=Column(String(255), nullable=False))
    is_active: bool = Field(default=True, nullable=False)


class PaymentStatus(SQLModel, table=True):
    __tablename__ = "payment_statuses"

    id: int = Field(primary_key=True)
    code: str = Field(sa_column=Column(String(50), unique=True, nullable=False, index=True))
    name: str = Field(sa_column=Column(String(100), nullable=False))
    description: str = Field(sa_column=Column(String(255), nullable=False))
    is_terminal: bool = Field(default=False, nullable=False)


class Payment(AuditMixin, table=True):
    __tablename__ = "payments"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(sa_column=Column(ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, index=True))
    payment_method_id: int = Field(sa_column=Column(ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=False))
    status_id: int = Field(sa_column=Column(ForeignKey("payment_statuses.id", ondelete="RESTRICT"), nullable=False, index=True))

    # MercadoPago tracking
    mp_preference_id: str | None = Field(default=None, sa_column=Column(String(255), nullable=True))
    mp_payment_id: str | None = Field(default=None, sa_column=Column(String(255), nullable=True, index=True))
    mp_merchant_order_id: str | None = Field(default=None, sa_column=Column(String(255), nullable=True))
    mp_external_reference: str | None = Field(default=None, sa_column=Column(String(255), nullable=True, index=True))

    # payment details
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    currency: str = Field(default="ARS", sa_column=Column(String(3), nullable=False, server_default="ARS"))

    # idempotency
    idempotency_key: str = Field(sa_column=Column(String(255), unique=True, nullable=False, index=True))

    # failure tracking
    failure_reason: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    attempts: int = Field(default=0, sa_column=Column(Integer, nullable=False, server_default="0"))

    __table_args__ = (
        Index("ix_payments_order_status", "order_id", "status_id"),
        Index("ix_payments_created_at", "created_at"),
    )

    @staticmethod
    def generate_idempotency_key() -> str:
        return f"pay-{uuid.uuid4().hex}"


class PaymentEvent(SQLModel, table=True):
    __tablename__ = "payment_events"

    id: int | None = Field(default=None, primary_key=True)
    payment_id: int = Field(sa_column=Column(ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True))
    event_type: str = Field(sa_column=Column(String(100), nullable=False))
    raw_payload: str = Field(sa_column=Column(Text, nullable=False))
    processed: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=utc_now, sa_column=Column(DateTime(timezone=True), nullable=False))

    __table_args__ = (
        Index("ix_payment_events_payment_created", "payment_id", "created_at"),
    )
