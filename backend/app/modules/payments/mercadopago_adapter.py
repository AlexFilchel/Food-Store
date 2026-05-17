import httpx
import structlog

from app.core.config import Settings
from app.modules.payments.gateway import (
    MercadoPagoPaymentStatus,
    MercadoPagoPort,
    MercadoPagoPreferenceResult,
)

logger = structlog.get_logger("mercadopago")


class MercadoPagoAdapter(MercadoPagoPort):
    """Adapter: real MercadoPago API integration."""

    def __init__(self, settings: Settings) -> None:
        self._access_token = settings.mp_access_token
        self._base_url = "https://api.mercadopago.com"
        self._timeout = 15.0

    async def create_preference(
        self,
        *,
        external_reference: str,
        items: list[dict],
        back_urls: dict,
        notification_url: str,
    ) -> MercadoPagoPreferenceResult:
        payload = {
            "external_reference": external_reference,
            "items": items,
            "back_urls": back_urls,
            "notification_url": notification_url,
            "statement_descriptor": "FOOD STORE",
        }

        # auto_return requires HTTPS back_urls — MP rejects HTTP URLs in production (APP_USR).
        # Only include it when all back_urls use HTTPS to avoid 400 errors in development.
        if self._uses_https_back_urls(back_urls):
            payload["auto_return"] = "approved"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    f"{self._base_url}/checkout/preferences",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self._access_token}",
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code != 201:
                    body = response.text
                    logger.error("mp.preference.create_failed", status=response.status_code, body=body)
                    return MercadoPagoPreferenceResult(
                        success=False,
                        error=f"MercadoPago {response.status_code}: {body}",
                    )

                data = response.json()
                logger.info("mp.preference.created", preference_id=data["id"])
                return MercadoPagoPreferenceResult(
                    success=True,
                    preference_id=data["id"],
                    init_point=data.get("init_point"),
                    sandbox_init_point=data.get("sandbox_init_point"),
                )
        except httpx.HTTPError as exc:
            logger.error("mp.preference.http_error", error=str(exc))
            return MercadoPagoPreferenceResult(success=False, error=str(exc))

    @staticmethod
    def _uses_https_back_urls(back_urls: dict) -> bool:
        """Check if all defined back_urls use HTTPS."""
        for url in back_urls.values():
            if isinstance(url, str) and url and not url.startswith("https://"):
                return False
        return True

    async def get_payment_status(self, mp_payment_id: str) -> MercadoPagoPaymentStatus:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(
                    f"{self._base_url}/v1/payments/{mp_payment_id}",
                    headers={"Authorization": f"Bearer {self._access_token}"},
                )

                if response.status_code != 200:
                    logger.error("mp.payment.get_failed", mp_payment_id=mp_payment_id, status=response.status_code)
                    return MercadoPagoPaymentStatus(
                        success=False,
                        error=f"MercadoPago returned status {response.status_code}",
                    )

                data = response.json()
                return MercadoPagoPaymentStatus(
                    success=True,
                    mp_payment_id=str(data["id"]),
                    status=data["status"],
                    status_detail=data.get("status_detail"),
                    external_reference=data.get("external_reference"),
                )
        except httpx.HTTPError as exc:
            logger.error("mp.payment.http_error", mp_payment_id=mp_payment_id, error=str(exc))
            return MercadoPagoPaymentStatus(success=False, error=str(exc))

    async def search_payment_by_external_reference(self, external_reference: str) -> MercadoPagoPaymentStatus:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(
                    f"{self._base_url}/v1/payments/search",
                    params={"external_reference": external_reference, "sort": "date_created", "criteria": "desc"},
                    headers={"Authorization": f"Bearer {self._access_token}"},
                )

                if response.status_code != 200:
                    return MercadoPagoPaymentStatus(
                        success=False,
                        error=f"MercadoPago returned status {response.status_code}",
                    )

                data = response.json()
                results = data.get("results", [])
                if not results:
                    return MercadoPagoPaymentStatus(success=False, error="No payment found")

                payment = results[0]
                return MercadoPagoPaymentStatus(
                    success=True,
                    mp_payment_id=str(payment["id"]),
                    status=payment["status"],
                    status_detail=payment.get("status_detail"),
                    external_reference=payment.get("external_reference"),
                )
        except httpx.HTTPError as exc:
            logger.error("mp.payment.search_error", external_reference=external_reference, error=str(exc))
            return MercadoPagoPaymentStatus(success=False, error=str(exc))


class MockMercadoPagoAdapter(MercadoPagoPort):
    """Adapter: mock for testing without real MercadoPago API."""

    def __init__(self) -> None:
        self._preferences: dict[str, MercadoPagoPreferenceResult] = {}
        self._payments: dict[str, MercadoPagoPaymentStatus] = {}
        self._payments_by_external_reference: dict[str, MercadoPagoPaymentStatus] = {}

    async def create_preference(
        self,
        *,
        external_reference: str,
        items: list[dict],
        back_urls: dict,
        notification_url: str,
    ) -> MercadoPagoPreferenceResult:
        preference_id = f"mock-pref-{external_reference}"
        result = MercadoPagoPreferenceResult(
            success=True,
            preference_id=preference_id,
            init_point=f"https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id={preference_id}",
            sandbox_init_point=f"https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id={preference_id}",
        )
        self._preferences[preference_id] = result
        return result

    async def get_payment_status(self, mp_payment_id: str) -> MercadoPagoPaymentStatus:
        if mp_payment_id in self._payments:
            return self._payments[mp_payment_id]
        return MercadoPagoPaymentStatus(
            success=True,
            mp_payment_id=mp_payment_id,
            status="approved",
            status_detail="accredited",
            external_reference=None,
        )

    async def search_payment_by_external_reference(self, external_reference: str) -> MercadoPagoPaymentStatus:
        if external_reference in self._payments_by_external_reference:
            return self._payments_by_external_reference[external_reference]
        return MercadoPagoPaymentStatus(success=False, error="No payment found")

    def set_mock_payment(self, mp_payment_id: str, status: str, external_reference: str | None = None) -> None:
        payment_status = MercadoPagoPaymentStatus(
            success=True,
            mp_payment_id=mp_payment_id,
            status=status,
            status_detail="accredited" if status == "approved" else "pending",
            external_reference=external_reference,
        )
        self._payments[mp_payment_id] = payment_status
        if external_reference is not None:
            self._payments_by_external_reference[external_reference] = payment_status
