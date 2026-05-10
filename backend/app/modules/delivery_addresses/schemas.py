from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.time import to_utc_iso
from app.modules.delivery_addresses.model import DeliveryAddress


def _normalize_required(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("String should have at least 1 character")
    return cleaned


def _normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


class DeliveryAddressResponse(BaseModel):
    id: int
    recipient_name: str
    phone: str
    street: str
    street_number: str
    floor: str | None
    apartment: str | None
    city: str
    province: str
    postal_code: str
    reference: str | None
    is_default: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_model(cls, address: DeliveryAddress) -> "DeliveryAddressResponse":
        return cls(
            id=address.id,
            recipient_name=address.recipient_name,
            phone=address.phone,
            street=address.street,
            street_number=address.street_number,
            floor=address.floor,
            apartment=address.apartment,
            city=address.city,
            province=address.province,
            postal_code=address.postal_code,
            reference=address.reference,
            is_default=address.is_default,
            created_at=to_utc_iso(address.created_at),
            updated_at=to_utc_iso(address.updated_at),
        )


class DeliveryAddressBaseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    recipient_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=1, max_length=40)
    street: str = Field(min_length=1, max_length=160)
    street_number: str = Field(min_length=1, max_length=20)
    floor: str | None = Field(default=None, max_length=20)
    apartment: str | None = Field(default=None, max_length=20)
    city: str = Field(min_length=1, max_length=120)
    province: str = Field(min_length=1, max_length=120)
    postal_code: str = Field(min_length=1, max_length=20)
    reference: str | None = Field(default=None, max_length=255)

    @field_validator(
        "recipient_name",
        "phone",
        "street",
        "street_number",
        "city",
        "province",
        "postal_code",
    )
    @classmethod
    def validate_required(cls, value: str) -> str:
        return _normalize_required(value)

    @field_validator("floor", "apartment", "reference")
    @classmethod
    def validate_optional(cls, value: str | None) -> str | None:
        return _normalize_optional(value)


class DeliveryAddressCreateRequest(DeliveryAddressBaseRequest):
    is_default: bool = False


class DeliveryAddressUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    recipient_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=1, max_length=40)
    street: str | None = Field(default=None, min_length=1, max_length=160)
    street_number: str | None = Field(default=None, min_length=1, max_length=20)
    floor: str | None = Field(default=None, max_length=20)
    apartment: str | None = Field(default=None, max_length=20)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    province: str | None = Field(default=None, min_length=1, max_length=120)
    postal_code: str | None = Field(default=None, min_length=1, max_length=20)
    reference: str | None = Field(default=None, max_length=255)
    is_default: bool | None = None

    @field_validator(
        "recipient_name",
        "phone",
        "street",
        "street_number",
        "city",
        "province",
        "postal_code",
    )
    @classmethod
    def validate_required(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_required(value)

    @field_validator("floor", "apartment", "reference")
    @classmethod
    def validate_optional(cls, value: str | None) -> str | None:
        return _normalize_optional(value)


class DeliveryAddressSetDefaultRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    is_default: bool = True


class DeliveryAddressRuleDoc(BaseModel):
    default_on_delete_rule: str
    at: str

    @classmethod
    def from_value(cls, value: str, now: datetime) -> "DeliveryAddressRuleDoc":
        return cls(default_on_delete_rule=value, at=to_utc_iso(now))
