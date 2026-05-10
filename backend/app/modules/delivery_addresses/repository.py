from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.core.time import utc_now
from app.modules.delivery_addresses.model import DeliveryAddress


class DeliveryAddressRepository(BaseRepository[DeliveryAddress]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DeliveryAddress)

    async def list_by_user(self, *, user_id: int) -> list[DeliveryAddress]:
        result = await self.session.execute(
            select(DeliveryAddress)
            .where(DeliveryAddress.user_id == user_id, DeliveryAddress.deleted_at.is_(None))
            .order_by(DeliveryAddress.is_default.desc(), DeliveryAddress.updated_at.desc(), DeliveryAddress.id.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_user(self, *, address_id: int, user_id: int) -> DeliveryAddress | None:
        result = await self.session.execute(
            select(DeliveryAddress).where(
                DeliveryAddress.id == address_id,
                DeliveryAddress.user_id == user_id,
                DeliveryAddress.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def count_active_by_user(self, *, user_id: int) -> int:
        result = await self.session.execute(
            select(DeliveryAddress.id).where(DeliveryAddress.user_id == user_id, DeliveryAddress.deleted_at.is_(None))
        )
        return len(list(result.scalars().all()))

    async def unset_default_for_user(self, *, user_id: int, exclude_id: int | None = None) -> None:
        statement = (
            update(DeliveryAddress)
            .where(DeliveryAddress.user_id == user_id, DeliveryAddress.deleted_at.is_(None), DeliveryAddress.is_default.is_(True))
            .values(is_default=False, updated_at=utc_now())
        )
        if exclude_id is not None:
            statement = statement.where(DeliveryAddress.id != exclude_id)
        await self.session.execute(statement)
        await self.session.flush()

    async def get_replacement_default_candidate(self, *, user_id: int) -> DeliveryAddress | None:
        result = await self.session.execute(
            select(DeliveryAddress)
            .where(DeliveryAddress.user_id == user_id, DeliveryAddress.deleted_at.is_(None))
            .order_by(DeliveryAddress.updated_at.desc(), DeliveryAddress.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
