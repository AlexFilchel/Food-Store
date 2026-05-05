from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin


class PaymentMethod(AuditMixin, table=True):
    __tablename__ = "payment_methods"

    id: int = Field(primary_key=True)
    code: str = Field(sa_column=Column(String(50), unique=True, nullable=False, index=True))
    name: str = Field(sa_column=Column(String(100), nullable=False))
    description: str = Field(sa_column=Column(String(255), nullable=False))
    is_active: bool = Field(default=True, nullable=False)
