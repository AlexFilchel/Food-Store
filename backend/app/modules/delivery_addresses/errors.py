from http import HTTPStatus

from app.core.errors import AppError


def delivery_address_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="DELIVERY_ADDRESS_NOT_FOUND",
        title="Delivery Address Not Found",
        detail="The requested delivery address does not exist.",
        type_path="delivery-address-not-found",
    )
