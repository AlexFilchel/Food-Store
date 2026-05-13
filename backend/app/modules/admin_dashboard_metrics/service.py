from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.time import to_utc_iso, utc_now
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.admin_dashboard_metrics.errors import admin_dashboard_invalid_filters
from app.modules.admin_dashboard_metrics.repository import AdminDashboardMetricsRepository
from app.modules.admin_dashboard_metrics.schemas import (
    DashboardMetricsQuery,
    DashboardMetricsResponse,
    EffectiveFiltersResponse,
    OrdersByStateResponse,
    SalesByPeriodBucketResponse,
    SummaryKpisResponse,
    TopProductResponse,
)

CANONICAL_STATES = (
    ("PENDIENTE", "Pendiente"),
    ("CONFIRMADO", "Confirmado"),
    ("EN_PREPARACION", "En preparación"),
    ("EN_CAMINO", "En camino"),
    ("ENTREGADO", "Entregado"),
    ("CANCELADO", "Cancelado"),
)
SUPPORTED_GRANULARITIES = {"day", "week", "month"}
PENDING_OPERATIONAL_STATES = ("PENDIENTE", "CONFIRMADO", "EN_PREPARACION", "EN_CAMINO")
DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires"


class AdminDashboardMetricsService:
    async def get_metrics(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        query: DashboardMetricsQuery,
    ) -> DashboardMetricsResponse:
        granularity = query.granularity.lower().strip()
        if granularity not in SUPPORTED_GRANULARITIES:
            raise admin_dashboard_invalid_filters(detail="Unsupported granularity. Use day, week, or month.")

        timezone_name = query.timezone or DEFAULT_TIMEZONE
        try:
            timezone = ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError as error:
            raise admin_dashboard_invalid_filters(detail="Invalid timezone value.") from error

        from_utc, to_utc = self._resolve_range(query, timezone)

        async with uow:
            repository = AdminDashboardMetricsRepository(uow.session)
            summary = await repository.get_summary(from_utc=from_utc, to_utc=to_utc, pending_states=PENDING_OPERATIONAL_STATES)
            sales_events = await repository.get_sales_by_period(from_utc=from_utc, to_utc=to_utc)
            top_products = await repository.get_top_products(from_utc=from_utc, to_utc=to_utc, limit=10)
            state_counts = await repository.get_orders_by_state(from_utc=from_utc, to_utc=to_utc)

        counted_orders = int(summary["counted_orders"])
        gross_revenue = Decimal(summary["gross_revenue"])
        average_ticket = Decimal("0.00") if counted_orders == 0 else (gross_revenue / Decimal(counted_orders)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        return DashboardMetricsResponse(
            effective_filters=EffectiveFiltersResponse(
                from_utc=to_utc_iso(from_utc),
                to_utc=to_utc_iso(to_utc),
                granularity=granularity,
                timezone=timezone_name,
            ),
            summary=SummaryKpisResponse(
                gross_approved_revenue=f"{gross_revenue:.2f}",
                counted_orders=counted_orders,
                average_ticket=f"{average_ticket:.2f}",
                pending_operational_count=int(summary["pending_count"]),
            ),
            sales_by_period=self._group_sales(sales_events=sales_events, granularity=granularity, timezone=timezone),
            top_products=[
                TopProductResponse(
                    product_id=row[0],
                    product_slug=row[1],
                    display_name=row[2],
                    units_sold=row[3],
                    gross_revenue=f"{row[4]:.2f}",
                    order_count=row[5],
                )
                for row in top_products
            ],
            orders_by_state=[
                OrdersByStateResponse(state_code=code, state_name=name, count=state_counts.get(code, 0))
                for code, name in CANONICAL_STATES
            ],
        )

    def _resolve_range(self, query: DashboardMetricsQuery, timezone: ZoneInfo) -> tuple[datetime, datetime]:
        now_local = utc_now().astimezone(timezone)
        if query.from_at is None and query.to is None:
            to_local = now_local
            from_local = now_local - timedelta(days=30)
            return from_local.astimezone(UTC), to_local.astimezone(UTC)

        try:
            from_value = query.from_at.replace("Z", "+00:00") if query.from_at else None
            to_value = query.to.replace("Z", "+00:00") if query.to else None
            from_local = datetime.fromisoformat(from_value) if from_value else (now_local - timedelta(days=30))
            to_local = datetime.fromisoformat(to_value) if to_value else now_local
        except ValueError as error:
            raise admin_dashboard_invalid_filters(detail="Invalid date format. Use ISO 8601.") from error

        if from_local.tzinfo is None:
            from_local = from_local.replace(tzinfo=timezone)
        else:
            from_local = from_local.astimezone(timezone)

        if to_local.tzinfo is None:
            to_local = to_local.replace(tzinfo=timezone)
        else:
            to_local = to_local.astimezone(timezone)

        if from_local > to_local:
            raise admin_dashboard_invalid_filters(detail="Invalid range: from must be earlier than to.")

        return from_local.astimezone(UTC), to_local.astimezone(UTC)

    def _group_sales(
        self,
        *,
        sales_events: list[tuple[datetime, Decimal, int]],
        granularity: str,
        timezone: ZoneInfo,
    ) -> list[SalesByPeriodBucketResponse]:
        buckets: dict[str, tuple[Decimal, int]] = {}
        for occurred_at, revenue, order_count in sales_events:
            if occurred_at.tzinfo is None:
                occurred_at = occurred_at.replace(tzinfo=UTC)
            local_dt = occurred_at.astimezone(timezone)
            if granularity == "day":
                key = local_dt.strftime("%Y-%m-%d")
            elif granularity == "week":
                year, week_number, _ = local_dt.isocalendar()
                key = f"{year}-W{week_number:02d}"
            else:
                key = local_dt.strftime("%Y-%m")
            current_revenue, current_orders = buckets.get(key, (Decimal("0.00"), 0))
            buckets[key] = (current_revenue + revenue, current_orders + order_count)

        return [
            SalesByPeriodBucketResponse(label=label, gross_revenue=f"{revenue:.2f}", order_count=orders)
            for label, (revenue, orders) in sorted(buckets.items(), key=lambda item: item[0])
        ]


admin_dashboard_metrics_service = AdminDashboardMetricsService()
