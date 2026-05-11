from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, text
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin
from app.core.time import utc_now


class OrderState(AuditMixin, table=True):
    __tablename__ = "order_states"

    id: int = Field(primary_key=True)
    code: str = Field(sa_column=Column(String(50), unique=True, nullable=False, index=True))
    name: str = Field(sa_column=Column(String(100), nullable=False))
    description: str = Field(sa_column=Column(String(255), nullable=False))
    is_terminal: bool = Field(default=False, nullable=False)
    sort_order: int = Field(nullable=False)


class Order(AuditMixin, table=True):
    __tablename__ = "orders"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True))
    state_id: int = Field(sa_column=Column(ForeignKey("order_states.id", ondelete="RESTRICT"), nullable=False, index=True))
    payment_method_id: int | None = Field(default=None, sa_column=Column(ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=True))
    order_number: str = Field(sa_column=Column(String(30), unique=True, nullable=False, index=True))

    # delivery address snapshot (immutable)
    delivery_recipient_name: str = Field(sa_column=Column(String(120), nullable=False))
    delivery_phone: str = Field(sa_column=Column(String(40), nullable=False))
    delivery_street: str = Field(sa_column=Column(String(160), nullable=False))
    delivery_street_number: str = Field(sa_column=Column(String(20), nullable=False))
    delivery_floor: str | None = Field(default=None, sa_column=Column(String(20), nullable=True))
    delivery_apartment: str | None = Field(default=None, sa_column=Column(String(20), nullable=True))
    delivery_city: str = Field(sa_column=Column(String(120), nullable=False))
    delivery_province: str = Field(sa_column=Column(String(120), nullable=False))
    delivery_postal_code: str = Field(sa_column=Column(String(20), nullable=False))
    delivery_reference: str | None = Field(default=None, sa_column=Column(String(255), nullable=True))

    subtotal: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    notes: str | None = Field(default=None, sa_column=Column(Text, nullable=True))

    __table_args__ = (
        Index("ix_orders_user_state", "user_id", "state_id"),
        Index("ix_orders_created_at", "created_at"),
    )


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(sa_column=Column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True))

    # product snapshot (immutable)
    product_id: int = Field(nullable=False)
    product_name: str = Field(sa_column=Column(String(160), nullable=False))
    product_slug: str = Field(sa_column=Column(String(180), nullable=False))
    unit_price: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    quantity: int = Field(sa_column=Column(Integer, nullable=False))
    line_total: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))

    # customization snapshot
    removed_ingredients: str = Field(default="", sa_column=Column(Text, nullable=False, server_default=""))


class OrderHistory(SQLModel, table=True):
    __tablename__ = "order_history"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(sa_column=Column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True))
    from_state_id: int | None = Field(default=None, sa_column=Column(ForeignKey("order_states.id", ondelete="RESTRICT"), nullable=True))
    to_state_id: int = Field(sa_column=Column(ForeignKey("order_states.id", ondelete="RESTRICT"), nullable=False))
    changed_by_user_id: int | None = Field(default=None, sa_column=Column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(default_factory=utc_now, sa_column=Column(DateTime(timezone=True), nullable=False))

    __table_args__ = (
        Index("ix_order_history_order_created", "order_id", "created_at"),
    )
