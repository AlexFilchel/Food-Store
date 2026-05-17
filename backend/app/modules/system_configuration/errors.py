from http import HTTPStatus

from app.core.errors import AppError, ErrorDetail


def system_configuration_validation(*, errors: list[ErrorDetail]) -> AppError:
    return AppError(
        status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
        code="SYSTEM_CONFIGURATION_VALIDATION_ERROR",
        title="Invalid Configuration Update",
        detail="One or more configuration values are invalid.",
        type_path="system-configuration-validation-error",
        errors=errors,
    )


def system_configuration_conflict(*, key: str) -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="SYSTEM_CONFIGURATION_STALE_VERSION",
        title="Stale Configuration Version",
        detail="The configuration was updated by another admin. Refresh and retry.",
        type_path="system-configuration-stale-version",
        errors=[ErrorDetail(field=f"body.updates.{key}.expected_version", message="Stale version")],
    )


def ordering_temporarily_disabled() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="ORDERING_DISABLED",
        title="Ordering Disabled",
        detail="La tienda deshabilitó temporalmente la creación de pedidos nuevos.",
        type_path="ordering-disabled",
    )
