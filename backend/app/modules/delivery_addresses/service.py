from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.delivery_addresses.errors import delivery_address_not_found
from app.modules.delivery_addresses.model import DeliveryAddress
from app.modules.delivery_addresses.schemas import (
    DeliveryAddressCreateRequest,
    DeliveryAddressResponse,
    DeliveryAddressUpdateRequest,
)


class DeliveryAddressService:
    async def list_addresses(self, uow: SqlAlchemyUnitOfWork, *, user_id: int) -> list[DeliveryAddressResponse]:
        async with uow:
            addresses = await uow.delivery_addresses.list_by_user(user_id=user_id)
            return [DeliveryAddressResponse.from_model(address) for address in addresses]

    async def get_address(self, uow: SqlAlchemyUnitOfWork, *, user_id: int, address_id: int) -> DeliveryAddressResponse:
        async with uow:
            address = await self._get_owned_address_or_fail(uow, user_id=user_id, address_id=address_id)
            return DeliveryAddressResponse.from_model(address)

    async def create_address(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        payload: DeliveryAddressCreateRequest,
    ) -> DeliveryAddressResponse:
        async with uow:
            active_count = await uow.delivery_addresses.count_active_by_user(user_id=user_id)
            should_be_default = active_count == 0 or payload.is_default
            if should_be_default:
                await uow.delivery_addresses.unset_default_for_user(user_id=user_id)
            address = await uow.delivery_addresses.create(
                DeliveryAddress(
                    user_id=user_id,
                    recipient_name=payload.recipient_name,
                    phone=payload.phone,
                    street=payload.street,
                    street_number=payload.street_number,
                    floor=payload.floor,
                    apartment=payload.apartment,
                    city=payload.city,
                    province=payload.province,
                    postal_code=payload.postal_code,
                    reference=payload.reference,
                    is_default=should_be_default,
                )
            )
            return DeliveryAddressResponse.from_model(address)

    async def update_address(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        address_id: int,
        payload: DeliveryAddressUpdateRequest,
    ) -> DeliveryAddressResponse:
        async with uow:
            address = await self._get_owned_address_or_fail(uow, user_id=user_id, address_id=address_id)
            updates = payload.model_dump(exclude_unset=True)
            make_default = updates.pop("is_default", None)
            updated = await uow.delivery_addresses.update(address, updates)
            if make_default is True:
                await uow.delivery_addresses.unset_default_for_user(user_id=user_id, exclude_id=updated.id)
                await uow.delivery_addresses.update(updated, {"is_default": True})
            return DeliveryAddressResponse.from_model(updated)

    async def set_default_address(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        address_id: int,
    ) -> DeliveryAddressResponse:
        async with uow:
            address = await self._get_owned_address_or_fail(uow, user_id=user_id, address_id=address_id)
            await uow.delivery_addresses.unset_default_for_user(user_id=user_id, exclude_id=address.id)
            updated = await uow.delivery_addresses.update(address, {"is_default": True})
            return DeliveryAddressResponse.from_model(updated)

    async def delete_address(self, uow: SqlAlchemyUnitOfWork, *, user_id: int, address_id: int) -> None:
        async with uow:
            address = await self._get_owned_address_or_fail(uow, user_id=user_id, address_id=address_id)
            was_default = bool(address.is_default)
            await uow.delivery_addresses.soft_delete(address)
            if was_default:
                replacement = await uow.delivery_addresses.get_replacement_default_candidate(user_id=user_id)
                if replacement is not None:
                    await uow.delivery_addresses.unset_default_for_user(user_id=user_id, exclude_id=replacement.id)
                    await uow.delivery_addresses.update(replacement, {"is_default": True})

    async def _get_owned_address_or_fail(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        address_id: int,
    ) -> DeliveryAddress:
        address = await uow.delivery_addresses.get_by_id_for_user(address_id=address_id, user_id=user_id)
        if address is None:
            raise delivery_address_not_found()
        return address


delivery_address_service = DeliveryAddressService()
