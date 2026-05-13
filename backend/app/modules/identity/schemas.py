from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings
from app.core.security import PASSWORD_MAX_BYTES, password_exceeds_bcrypt_limit
from app.core.time import to_utc_iso
from app.modules.identity.model import User


class AdminUserSummaryResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    is_active: bool
    roles: list[str]
    created_at: str
    updated_at: str

    @classmethod
    def from_model(cls, user: User, *, roles: list[str]) -> "AdminUserSummaryResponse":
        return cls(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            is_active=user.is_active,
            roles=roles,
            created_at=to_utc_iso(user.created_at),
            updated_at=to_utc_iso(user.updated_at),
        )


class AdminUserDetailResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    is_active: bool
    roles: list[str]
    created_at: str
    updated_at: str
    deleted_at: str | None

    @classmethod
    def from_model(cls, user: User, *, roles: list[str]) -> "AdminUserDetailResponse":
        return cls(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=user.full_name,
            email=user.email,
            is_active=user.is_active,
            roles=roles,
            created_at=to_utc_iso(user.created_at),
            updated_at=to_utc_iso(user.updated_at),
            deleted_at=to_utc_iso(user.deleted_at) if user.deleted_at else None,
        )


class AdminUserCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: str
    password: str
    role_codes: list[str] = Field(min_length=1)
    is_active: bool = True

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("String should have at least 1 character")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        candidate = value.strip().lower()
        if "@" not in candidate or candidate.startswith("@") or candidate.endswith("@"):
            raise ValueError("Value must be a valid email address")
        return candidate

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        minimum = get_settings().password_min_length
        if len(value) < minimum:
            raise ValueError(f"String should have at least {minimum} characters")
        if password_exceeds_bcrypt_limit(value):
            raise ValueError(f"String should have at most {PASSWORD_MAX_BYTES} UTF-8 bytes")
        return value

    @field_validator("role_codes")
    @classmethod
    def validate_role_codes(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for entry in value:
            role = entry.strip().upper()
            if not role:
                raise ValueError("Role code must not be empty")
            cleaned.append(role)
        return cleaned


class AdminUserUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: str | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_optional_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("String should have at least 1 character")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_optional_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        candidate = value.strip().lower()
        if "@" not in candidate or candidate.startswith("@") or candidate.endswith("@"):
            raise ValueError("Value must be a valid email address")
        return candidate


class AdminUserRoleUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role_codes: list[str] = Field(min_length=1)

    @field_validator("role_codes")
    @classmethod
    def validate_role_codes(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for entry in value:
            role = entry.strip().upper()
            if not role:
                raise ValueError("Role code must not be empty")
            cleaned.append(role)
        return cleaned


class AdminUserLifecycleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    is_active: bool


class AdminUserPasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        minimum = get_settings().password_min_length
        if len(value) < minimum:
            raise ValueError(f"String should have at least {minimum} characters")
        if password_exceeds_bcrypt_limit(value):
            raise ValueError(f"String should have at most {PASSWORD_MAX_BYTES} UTF-8 bytes")
        return value


class AdminUserRoleUpdateResponse(BaseModel):
    user_id: int
    roles: list[str]


class AdminUserLifecycleResponse(BaseModel):
    user_id: int
    is_active: bool


class AdminUserPasswordResetResponse(BaseModel):
    user_id: int
    reset_at: str

    @classmethod
    def from_values(cls, *, user_id: int, reset_at: datetime) -> "AdminUserPasswordResetResponse":
        return cls(user_id=user_id, reset_at=to_utc_iso(reset_at))
