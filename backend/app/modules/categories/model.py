from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlmodel import Field

from app.core.models import AuditMixin, SoftDeleteMixin


class Category(AuditMixin, SoftDeleteMixin, table=True):
    __tablename__ = "categories"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(120), nullable=False))
    slug: str = Field(sa_column=Column(String(140), nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    parent_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True),
    )
    sort_order: int = Field(default=0, sa_column=Column(Integer, nullable=False, server_default="0"))
    is_active: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="1"))
