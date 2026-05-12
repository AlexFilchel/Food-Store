from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.modules.payments.model import Payment, PaymentEvent, PaymentMethod, PaymentStatus


class PaymentMethodRepository(BaseRepository[PaymentMethod]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PaymentMethod)

    async def get_by_code(self, code: str) -> PaymentMethod | None:
        result = await self.session.execute(select(PaymentMethod).where(PaymentMethod.code == code))
        return result.scalar_one_or_none()


class PaymentStatusRepository(BaseRepository[PaymentStatus]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PaymentStatus)

    async def get_by_code(self, code: str) -> PaymentStatus | None:
        result = await self.session.execute(select(PaymentStatus).where(PaymentStatus.code == code))
        return result.scalar_one_or_none()


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Payment)

    async def get_by_order_id(self, order_id: int) -> Payment | None:
        result = await self.session.execute(
            select(Payment).where(Payment.order_id == order_id).order_by(Payment.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_mp_payment_id(self, mp_payment_id: str) -> Payment | None:
        result = await self.session.execute(
            select(Payment).where(Payment.mp_payment_id == mp_payment_id)
        )
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, idempotency_key: str) -> Payment | None:
        result = await self.session.execute(
            select(Payment).where(Payment.idempotency_key == idempotency_key)
        )
        return result.scalar_one_or_none()

    async def get_by_external_reference(self, external_reference: str) -> Payment | None:
        result = await self.session.execute(
            select(Payment).where(Payment.mp_external_reference == external_reference)
        )
        return result.scalar_one_or_none()


class PaymentEventRepository(BaseRepository[PaymentEvent]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PaymentEvent)

    async def list_by_payment(self, *, payment_id: int) -> list[PaymentEvent]:
        result = await self.session.execute(
            select(PaymentEvent).where(PaymentEvent.payment_id == payment_id).order_by(PaymentEvent.created_at)
        )
        return list(result.scalars().all())

    async def get_by_type_and_payload(self, *, payment_id: int, event_type: str, raw_payload: str) -> PaymentEvent | None:
        result = await self.session.execute(
            select(PaymentEvent).where(
                PaymentEvent.payment_id == payment_id,
                PaymentEvent.event_type == event_type,
                PaymentEvent.raw_payload == raw_payload,
            )
        )
        return result.scalar_one_or_none()
