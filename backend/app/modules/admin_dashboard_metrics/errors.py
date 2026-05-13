from http import HTTPStatus

from app.core.errors import AppError


def admin_dashboard_invalid_filters(*, detail: str) -> AppError:
    return AppError(
        status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
        code="ADMIN_DASHBOARD_INVALID_FILTERS",
        title="Invalid dashboard filters",
        detail=detail,
        type_path="admin-dashboard-invalid-filters",
    )
