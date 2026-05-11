from http import HTTPStatus

from app.core.errors import AppError, ErrorDetail


def order_empty_cart() -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="ORDER_EMPTY_CART",
        title="Empty Cart",
        detail="Cannot create an order with no items.",
        type_path="order-empty-cart",
    )


def order_invalid_quantity(*, line_index: int) -> AppError:
    return AppError(
        status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
        code="ORDER_INVALID_QUANTITY",
        title="Invalid Quantity",
        detail="One or more items have an invalid quantity.",
        type_path="order-invalid-quantity",
        errors=[ErrorDetail(field=f"body.items.{line_index}.quantity", message="Quantity must be an integer greater than zero")],
    )


def order_product_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="ORDER_PRODUCT_NOT_FOUND",
        title="Product Not Found",
        detail="One or more products are not available.",
        type_path="order-product-not-found",
    )


def order_insufficient_stock(*, line_index: int, product_id: int) -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="ORDER_INSUFFICIENT_STOCK",
        title="Insufficient Stock",
        detail="One or more products do not have enough stock for the requested quantity.",
        type_path="order-insufficient-stock",
        errors=[ErrorDetail(field=f"body.items.{line_index}.product_id", message=f"Insufficient stock for product {product_id}")],
    )


def order_invalid_customization(*, line_index: int) -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="ORDER_INVALID_CUSTOMIZATION",
        title="Invalid Customization",
        detail="One or more ingredient customizations are invalid.",
        type_path="order-invalid-customization",
        errors=[ErrorDetail(field=f"body.items.{line_index}.removed_ingredient_ids", message="Invalid removed ingredient selection")],
    )


def order_delivery_address_required() -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="ORDER_DELIVERY_ADDRESS_REQUIRED",
        title="Delivery Address Required",
        detail="Select a delivery address before creating an order.",
        type_path="order-delivery-address-required",
    )


def order_delivery_address_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="ORDER_DELIVERY_ADDRESS_NOT_FOUND",
        title="Delivery Address Not Found",
        detail="The selected delivery address does not exist.",
        type_path="order-delivery-address-not-found",
    )


def order_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="ORDER_NOT_FOUND",
        title="Order Not Found",
        detail="The requested order does not exist.",
        type_path="order-not-found",
    )


def order_payment_method_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="ORDER_PAYMENT_METHOD_NOT_FOUND",
        title="Payment Method Not Found",
        detail="The selected payment method does not exist.",
        type_path="order-payment-method-not-found",
    )
