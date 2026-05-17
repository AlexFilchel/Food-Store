from decimal import Decimal

from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.checkout.errors import (
    checkout_delivery_address_not_found,
    checkout_delivery_address_required,
    checkout_empty_cart,
    checkout_insufficient_stock,
    checkout_invalid_customization,
    checkout_invalid_quantity,
    checkout_product_invalid,
)
from app.modules.checkout.schemas import (
    CheckoutPreflightAddressSnapshot,
    CheckoutPreflightCustomizationSummary,
    CheckoutPreflightRequest,
    CheckoutPreflightResponse,
    CheckoutPreflightValidatedLine,
    to_money,
)
from app.modules.system_configuration.service import system_configuration_service


class CheckoutService:
    async def preflight(self, uow: SqlAlchemyUnitOfWork, *, user_id: int, payload: CheckoutPreflightRequest) -> CheckoutPreflightResponse:
        if not payload.items:
            raise checkout_empty_cart()

        async with uow:
            effective_map = await system_configuration_service.get_effective_map_in_uow(uow)
            max_items = int(effective_map["orders.max_items_per_order"])
            max_qty = int(effective_map["orders.max_quantity_per_item"])
            if len(payload.items) > max_items:
                raise checkout_invalid_quantity(line_index=0)

            address = await self._resolve_address(uow, user_id=user_id, delivery_address_id=payload.delivery_address_id)
            validated_lines: list[CheckoutPreflightValidatedLine] = []
            subtotal = Decimal("0.00")

            for index, line in enumerate(payload.items):
                if not isinstance(line.quantity, int) or line.quantity < 1:
                    raise checkout_invalid_quantity(line_index=index)
                if line.quantity > max_qty:
                    raise checkout_invalid_quantity(line_index=index)

                product = await uow.products.get_by_id(line.product_id)
                if (
                    product is None
                    or product.deleted_at is not None
                    or not product.is_active
                    or not product.is_available
                ):
                    raise checkout_product_invalid()

                if product.stock_quantity < line.quantity:
                    raise checkout_insufficient_stock(line_index=index, product_id=line.product_id)

                ingredients = await uow.products.list_ingredients_for_product(product.id)
                ingredient_map = {ingredient.id: (ingredient.name, is_removable) for ingredient, is_removable in ingredients}
                removed_names: list[str] = []
                for ingredient_id in sorted(set(line.removed_ingredient_ids)):
                    ingredient = ingredient_map.get(ingredient_id)
                    if ingredient is None or not ingredient[1]:
                        raise checkout_invalid_customization(line_index=index)
                    removed_names.append(ingredient[0])

                line_total = product.price * Decimal(line.quantity)
                subtotal += line_total
                validated_lines.append(
                    CheckoutPreflightValidatedLine(
                        product_id=product.id,
                        product_name=product.name,
                        quantity=line.quantity,
                        unit_price=to_money(product.price),
                        line_total=to_money(line_total),
                        customization=CheckoutPreflightCustomizationSummary(removed_ingredients=removed_names),
                    )
                )

            return CheckoutPreflightResponse(
                lines=validated_lines,
                delivery_address=CheckoutPreflightAddressSnapshot(
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
                ),
                subtotal=to_money(subtotal),
            )

    async def _resolve_address(self, uow: SqlAlchemyUnitOfWork, *, user_id: int, delivery_address_id: int | None):
        if delivery_address_id is not None:
            address = await uow.delivery_addresses.get_by_id_for_user(address_id=delivery_address_id, user_id=user_id)
            if address is None:
                raise checkout_delivery_address_not_found()
            return address

        addresses = await uow.delivery_addresses.list_by_user(user_id=user_id)
        default_address = next((address for address in addresses if address.is_default), None)
        if default_address is None:
            raise checkout_delivery_address_required()
        return default_address


checkout_service = CheckoutService()
