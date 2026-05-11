from http import HTTPStatus

from app.core.errors import AppError, ErrorDetail


def checkout_empty_cart() -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="CHECKOUT_EMPTY_CART",
        title="Empty Cart",
        detail="Your cart is empty. Add products before checkout.",
        type_path="checkout-empty-cart",
    )


def checkout_invalid_quantity(*, line_index: int) -> AppError:
    return AppError(
        status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
        code="CHECKOUT_INVALID_QUANTITY",
        title="Invalid Quantity",
        detail="One or more cart lines have an invalid quantity.",
        type_path="checkout-invalid-quantity",
        errors=[ErrorDetail(field=f"body.items.{line_index}.quantity", message="Quantity must be an integer greater than zero")],
    )


def checkout_product_invalid() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="CHECKOUT_PRODUCT_INVALID",
        title="Product Unavailable",
        detail="One or more products are not available for checkout.",
        type_path="checkout-product-invalid",
    )


def checkout_insufficient_stock(*, line_index: int, product_id: int) -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="CHECKOUT_INSUFFICIENT_STOCK",
        title="Insufficient Stock",
        detail="One or more products do not have enough stock for the requested quantity.",
        type_path="checkout-insufficient-stock",
        errors=[ErrorDetail(field=f"body.items.{line_index}.product_id", message=f"Insufficient stock for product {product_id}")],
    )


def checkout_invalid_customization(*, line_index: int) -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="CHECKOUT_INVALID_CUSTOMIZATION",
        title="Invalid Customization",
        detail="One or more ingredient customizations are invalid.",
        type_path="checkout-invalid-customization",
        errors=[ErrorDetail(field=f"body.items.{line_index}.removed_ingredient_ids", message="Invalid removed ingredient selection")],
    )


def checkout_delivery_address_required() -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="CHECKOUT_DELIVERY_ADDRESS_REQUIRED",
        title="Delivery Address Required",
        detail="Select a delivery address before checkout.",
        type_path="checkout-delivery-address-required",
    )


def checkout_delivery_address_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="CHECKOUT_DELIVERY_ADDRESS_NOT_FOUND",
        title="Delivery Address Not Found",
        detail="The selected delivery address does not exist.",
        type_path="checkout-delivery-address-not-found",
    )
