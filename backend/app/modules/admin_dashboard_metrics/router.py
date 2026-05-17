from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.admin_dashboard_metrics.schemas import DashboardMetricsQuery, DashboardMetricsResponse
from app.modules.admin_dashboard_metrics.service import admin_dashboard_metrics_service
from app.modules.auth.dependencies import require_role

router = APIRouter(
    prefix="/admin/dashboard/metrics",
    tags=["admin-dashboard-metrics"],
    dependencies=[Depends(require_role("ADMIN"))],
)


@router.get("", response_model=DashboardMetricsResponse)
async def get_admin_dashboard_metrics(
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    from_: Annotated[str | None, Query(alias="from")] = None,
    to: str | None = None,
    granularity: str = "day",
    timezone: str | None = None,
) -> DashboardMetricsResponse:
    filters = DashboardMetricsQuery(from_at=from_, to=to, granularity=granularity, timezone=timezone)
    return await admin_dashboard_metrics_service.get_metrics(uow, query=filters)
