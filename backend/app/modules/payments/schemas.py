from pydantic import BaseModel, ConfigDict, Field


class PaymentInitRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    order_id: int = Field(ge=1)


class PaymentInitResponse(BaseModel):
    payment_id: int
    preference_id: str
    init_point: str
    sandbox_init_point: str | None
    external_reference: str


class PaymentStatusResponse(BaseModel):
    payment_id: int
    order_id: int
    status: str
    mp_payment_id: str | None
    amount: str
    attempts: int
    failure_reason: str | None
    retry_allowed: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_model(
        cls,
        payment,
        *,
        status_name: str,
        created_at: str,
        updated_at: str,
        retry_allowed: bool,
    ) -> "PaymentStatusResponse":
        return cls(
            payment_id=payment.id,
            order_id=payment.order_id,
            status=status_name,
            mp_payment_id=payment.mp_payment_id,
            amount=f"{payment.amount:.2f}",
            attempts=payment.attempts,
            failure_reason=payment.failure_reason,
            retry_allowed=retry_allowed,
            created_at=created_at,
            updated_at=updated_at,
        )


class PaymentWebhookPayload(BaseModel):
    """MercadoPago webhook notification payload."""
    model_config = ConfigDict(extra="ignore")

    type: str | None = None
    data: dict | None = None
    action: str | None = None
    api_version: str | None = None
    date_created: str | None = None
    id: str | int | None = None
    live_mode: bool | None = None
    user_id: str | int | None = None


class PaymentRetryResponse(BaseModel):
    payment_id: int
    preference_id: str
    init_point: str
    sandbox_init_point: str | None
    attempts: int
