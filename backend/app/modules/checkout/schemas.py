from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CheckoutPreflightLineRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    product_id: int = Field(ge=1)
    quantity: int
    removed_ingredient_ids: list[int] = Field(default_factory=list)


class CheckoutPreflightRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[CheckoutPreflightLineRequest] = Field(default_factory=list)
    delivery_address_id: int | None = Field(default=None, ge=1)


class CheckoutPreflightCustomizationSummary(BaseModel):
    removed_ingredients: list[str] = Field(default_factory=list)


class CheckoutPreflightValidatedLine(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: str
    line_total: str
    customization: CheckoutPreflightCustomizationSummary


class CheckoutPreflightAddressSnapshot(BaseModel):
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


class CheckoutPreflightResponse(BaseModel):
    lines: list[CheckoutPreflightValidatedLine]
    delivery_address: CheckoutPreflightAddressSnapshot
    subtotal: str


def to_money(value: Decimal) -> str:
    return f"{value:.2f}"
