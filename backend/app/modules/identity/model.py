from sqlalchemy import Column, DateTime, String
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin, SoftDeleteMixin


class Role(AuditMixin, table=True):
    __tablename__ = "roles"

    id: int = Field(primary_key=True)
    code: str = Field(sa_column=Column(String(50), unique=True, nullable=False, index=True))
    name: str = Field(sa_column=Column(String(100), nullable=False))
    description: str = Field(sa_column=Column(String(255), nullable=False))


class User(AuditMixin, SoftDeleteMixin, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    full_name: str = Field(sa_column=Column(String(120), nullable=False))
    email: str = Field(sa_column=Column(String(255), unique=True, nullable=False, index=True))
    hashed_password: str = Field(sa_column=Column(String(255), nullable=False))
    is_active: bool = Field(default=True, nullable=False)


class UserRole(AuditMixin, table=True):
    __tablename__ = "user_roles"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    role_id: int = Field(foreign_key="roles.id", nullable=False, index=True)
