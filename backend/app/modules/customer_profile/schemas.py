from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings
from app.core.security import PASSWORD_MAX_BYTES, password_exceeds_bcrypt_limit
from app.core.time import to_utc_iso


class CustomerProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    roles: list[str]
    created_at: str

    @classmethod
    def from_values(
        cls,
        *,
        user_id: int,
        first_name: str,
        last_name: str,
        email: str,
        roles: list[str],
        created_at: datetime,
    ) -> "CustomerProfileResponse":
        return cls(
            id=user_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            roles=roles,
            created_at=to_utc_iso(created_at),
        )


class CustomerProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: str

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


class CustomerChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    current_password: str = Field(min_length=1)
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
