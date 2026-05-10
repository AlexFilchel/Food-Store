from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, text
from sqlmodel import Field

from app.core.models import AuditMixin, SoftDeleteMixin


class DeliveryAddress(AuditMixin, SoftDeleteMixin, table=True):
    __tablename__ = "delivery_addresses"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True))
    recipient_name: str = Field(sa_column=Column(String(120), nullable=False))
    phone: str = Field(sa_column=Column(String(40), nullable=False))
    street: str = Field(sa_column=Column(String(160), nullable=False))
    street_number: str = Field(sa_column=Column(String(20), nullable=False))
    floor: str | None = Field(default=None, sa_column=Column(String(20), nullable=True))
    apartment: str | None = Field(default=None, sa_column=Column(String(20), nullable=True))
    city: str = Field(sa_column=Column(String(120), nullable=False))
    province: str = Field(sa_column=Column(String(120), nullable=False))
    postal_code: str = Field(sa_column=Column(String(20), nullable=False))
    reference: str | None = Field(default=None, sa_column=Column(String(255), nullable=True))
    is_default: bool = Field(sa_column=Column(Boolean, nullable=False, server_default=text("false")))

    __table_args__ = (
        Index("ix_delivery_addresses_user_deleted", "user_id", "deleted_at"),
        Index(
            "uq_delivery_addresses_default_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("deleted_at IS NULL AND is_default IS TRUE"),
            sqlite_where=text("deleted_at IS NULL AND is_default = 1"),
        ),
        Index("ix_delivery_addresses_default_user", "user_id", "is_default"),
        Index("ix_delivery_addresses_deleted_at", "deleted_at"),
    )
