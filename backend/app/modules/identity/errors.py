from http import HTTPStatus

from app.core.errors import AppError, ErrorDetail


def admin_user_duplicate_email() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="ADMIN_USER_DUPLICATE_EMAIL",
        title="Duplicate Email",
        detail="The provided email is already in use.",
        type_path="admin-user-duplicate-email",
    )


def admin_user_invalid_role(*, role_code: str) -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="ADMIN_USER_INVALID_ROLE",
        title="Invalid Role",
        detail="One or more role codes are invalid.",
        type_path="admin-user-invalid-role",
        errors=[ErrorDetail(field="role_codes", message=f"Unknown role: {role_code}")],
    )


def admin_user_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="ADMIN_USER_NOT_FOUND",
        title="User Not Found",
        detail="The requested user does not exist.",
        type_path="admin-user-not-found",
    )


def admin_user_last_admin_forbidden(*, action: str) -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="ADMIN_USER_LAST_ADMIN_FORBIDDEN",
        title="Last Admin Protected",
        detail=f"Cannot {action} the last active admin user.",
        type_path="admin-user-last-admin-forbidden",
    )
