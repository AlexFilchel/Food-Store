from http import HTTPStatus

from app.core.errors import AppError


def customer_profile_duplicate_email() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="CUSTOMER_PROFILE_DUPLICATE_EMAIL",
        title="Duplicate Email",
        detail="The provided email is already in use.",
        type_path="customer-profile-duplicate-email",
    )


def customer_profile_invalid_current_password() -> AppError:
    return AppError(
        status_code=HTTPStatus.UNAUTHORIZED,
        code="CUSTOMER_PROFILE_INVALID_CURRENT_PASSWORD",
        title="Invalid Current Password",
        detail="The current password is incorrect.",
        type_path="customer-profile-invalid-current-password",
    )
