from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlmodel import Field

from app.core.models import AuditMixin


class RefreshToken(AuditMixin, table=True):
    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("users.id"), nullable=False, index=True))
    token_hash: str = Field(sa_column=Column(String(64), nullable=False, unique=True, index=True))
    family_id: str = Field(sa_column=Column(String(36), nullable=False, index=True))
    rotated_from_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("refresh_tokens.id"), nullable=True),
    )
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False, index=True))
    revoked_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    used_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    created_by_ip: str | None = Field(default=None, sa_column=Column(String(64), nullable=True))
    user_agent: str | None = Field(default=None, sa_column=Column(String(255), nullable=True))
