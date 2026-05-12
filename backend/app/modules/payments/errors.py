from http import HTTPStatus

from app.core.errors import AppError


def payment_order_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="PAYMENT_ORDER_NOT_FOUND",
        title="Order Not Found",
        detail="The specified order does not exist.",
        type_path="payment-order-not-found",
    )


def payment_order_not_owned() -> AppError:
    return AppError(
        status_code=HTTPStatus.FORBIDDEN,
        code="PAYMENT_ORDER_NOT_OWNED",
        title="Order Not Owned",
        detail="You can only pay for your own orders.",
        type_path="payment-order-not-owned",
    )


def payment_order_not_pending() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="PAYMENT_ORDER_NOT_PENDING",
        title="Order Not Pending",
        detail="The order is not in a payable state.",
        type_path="payment-order-not-pending",
    )


def payment_already_exists() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="PAYMENT_ALREADY_EXISTS",
        title="Payment Already Exists",
        detail="An active payment already exists for this order. Use retry instead.",
        type_path="payment-already-exists",
    )


def payment_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="PAYMENT_NOT_FOUND",
        title="Payment Not Found",
        detail="The specified payment does not exist.",
        type_path="payment-not-found",
    )


def payment_preference_creation_failed() -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_GATEWAY,
        code="PAYMENT_PREFERENCE_FAILED",
        title="Payment Preference Failed",
        detail="Could not create payment preference with MercadoPago.",
        type_path="payment-preference-failed",
    )


def payment_webhook_processing_failed() -> AppError:
    return AppError(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
        code="PAYMENT_WEBHOOK_FAILED",
        title="Webhook Processing Failed",
        detail="Could not process the payment notification.",
        type_path="payment-webhook-failed",
    )
