from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin


class OrderState(AuditMixin, table=True):
    __tablename__ = "order_states"

    id: int = Field(primary_key=True)
    code: str = Field(sa_column=Column(String(50), unique=True, nullable=False, index=True))
    name: str = Field(sa_column=Column(String(100), nullable=False))
    description: str = Field(sa_column=Column(String(255), nullable=False))
    is_terminal: bool = Field(default=False, nullable=False)
    sort_order: int = Field(nullable=False)
