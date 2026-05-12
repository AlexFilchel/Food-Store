from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class MercadoPagoPreferenceResult:
    success: bool
    preference_id: str | None = None
    init_point: str | None = None
    sandbox_init_point: str | None = None
    error: str | None = None


@dataclass
class MercadoPagoPaymentStatus:
    success: bool
    mp_payment_id: str | None = None
    status: str | None = None
    status_detail: str | None = None
    external_reference: str | None = None
    error: str | None = None


class MercadoPagoPort(ABC):
    """Port: abstract interface for MercadoPago integration."""

    @abstractmethod
    async def create_preference(
        self,
        *,
        external_reference: str,
        items: list[dict],
        back_urls: dict,
        notification_url: str,
    ) -> MercadoPagoPreferenceResult: ...

    @abstractmethod
    async def get_payment_status(self, mp_payment_id: str) -> MercadoPagoPaymentStatus: ...

    @abstractmethod
    async def search_payment_by_external_reference(self, external_reference: str) -> MercadoPagoPaymentStatus: ...
