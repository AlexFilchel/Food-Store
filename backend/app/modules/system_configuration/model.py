from datetime import datetime

from sqlalchemy import JSON, Column, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin


class SystemConfigurationValue(AuditMixin, table=True):
    __tablename__ = "system_configuration_values"

    key: str = Field(sa_column=Column(String(120), primary_key=True))
    value_json: object | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    version: int = Field(default=1, sa_column=Column(Integer, nullable=False, server_default="1"))
    updated_by_user_id: int | None = Field(default=None, sa_column=Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True))


class SystemConfigurationAudit(SQLModel, table=True):
    __tablename__ = "system_configuration_audit"

    id: int | None = Field(default=None, primary_key=True)
    key: str = Field(sa_column=Column(String(120), nullable=False, index=True))
    old_value_json: object | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    new_value_json: object | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    reason: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    request_id: str | None = Field(default=None, sa_column=Column(String(120), nullable=True, index=True))
    changed_by_user_id: int | None = Field(default=None, sa_column=Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True))
    changed_at: datetime = Field(nullable=False)
