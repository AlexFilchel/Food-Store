from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.time import to_utc_iso, utc_now
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.admin_dashboard_metrics.errors import admin_dashboard_invalid_filters
from app.modules.admin_dashboard_metrics.repository import AdminDashboardMetricsRepository
from app.modules.admin_dashboard_metrics.schemas import (
    CategoryInsightResponse,
    DashboardMetricsQuery,
    DashboardMetricsResponse,
    EffectiveFiltersResponse,
    HealthResponse,
    KpiComparisonResponse,
    OperationalAlertResponse,
    OrdersByStateResponse,
    RecentSaleResponse,
    SalesByPeriodBucketResponse,
    SummaryKpisResponse,
    TopProductResponse,
)
from app.modules.system_configuration.service import system_configuration_service

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
MAX_BUCKETS = {"day": 366, "week": 104, "month": 60}


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

        async with uow:
            effective_map = await system_configuration_service.get_effective_map_in_uow(uow)

        timezone_name = str(query.timezone or effective_map.get("business.timezone") or DEFAULT_TIMEZONE)
        try:
            timezone = ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError:
            timezone_name = DEFAULT_TIMEZONE
            timezone = ZoneInfo(DEFAULT_TIMEZONE)

        range_info = self._resolve_range(query, timezone)
        from_utc = range_info["from_utc"]
        to_utc = range_info["to_utc"]
        from_date = range_info["from_date"]
        to_date = range_info["to_date"]

        if self._count_buckets(from_date, to_date, granularity) > MAX_BUCKETS[granularity]:
            raise admin_dashboard_invalid_filters(detail=f"Range exceeds max buckets for granularity '{granularity}'.")

        previous_from_date, previous_to_date = self._previous_window(from_date, to_date)
        previous_from_utc = datetime.combine(previous_from_date, datetime.min.time(), tzinfo=timezone).astimezone(UTC)
        previous_to_utc = datetime.combine(previous_to_date, datetime.min.time(), tzinfo=timezone).astimezone(UTC)

        now = utc_now()
        threshold = effective_map.get("orders.pending_payment_expiration_minutes")
        if isinstance(threshold, int):
            stuck_minutes = threshold
            threshold_source = "system_configuration"
        else:
            stuck_minutes = 30
            threshold_source = "default"

        async with uow:
            repository = AdminDashboardMetricsRepository(uow.session)
            summary = await repository.get_summary(from_utc=from_utc, to_utc=to_utc, pending_states=PENDING_OPERATIONAL_STATES)
            previous_summary = await repository.get_summary(from_utc=previous_from_utc, to_utc=previous_to_utc, pending_states=PENDING_OPERATIONAL_STATES)
            sales_events = await repository.get_sales_by_period(from_utc=from_utc, to_utc=to_utc)
            top_products = await repository.get_top_products(from_utc=from_utc, to_utc=to_utc, limit=10)
            state_counts = await repository.get_orders_by_state(from_utc=from_utc, to_utc=to_utc)
            health_counts = await repository.get_health_counts(
                from_utc=from_utc,
                to_utc=to_utc,
                stuck_minutes=stuck_minutes,
                now_utc=now,
            )
            category_insights = await repository.get_category_insights(from_utc=from_utc, to_utc=to_utc, limit=5)
            recent_sales = await repository.get_recent_sales(from_utc=from_utc, to_utc=to_utc, limit=8)

        counted_orders = int(summary["counted_orders"])
        gross_revenue = Decimal(summary["gross_revenue"])
        average_ticket = Decimal("0.00") if counted_orders == 0 else (gross_revenue / Decimal(counted_orders)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        prev_counted_orders = int(previous_summary["counted_orders"])
        prev_gross_revenue = Decimal(previous_summary["gross_revenue"])
        prev_average_ticket = Decimal("0.00") if prev_counted_orders == 0 else (prev_gross_revenue / Decimal(prev_counted_orders)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        return DashboardMetricsResponse(
            effective_filters=EffectiveFiltersResponse(
                from_at=from_date.isoformat(),
                to=to_date.isoformat(),
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
            sales_by_period=self._group_sales(
                sales_events=sales_events,
                granularity=granularity,
                timezone=timezone,
                from_date=from_date,
                to_date=to_date,
            ),
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
            kpi_comparisons=[
                self._build_comparison(
                    key="gross_approved_revenue",
                    label="Ventas aprobadas",
                    value_type="currency",
                    current=gross_revenue,
                    previous=prev_gross_revenue,
                    comparison_from=previous_from_date,
                    comparison_to=from_date,
                ),
                self._build_comparison(
                    key="counted_orders",
                    label="Pedidos contabilizados",
                    value_type="count",
                    current=Decimal(counted_orders),
                    previous=Decimal(prev_counted_orders),
                    comparison_from=previous_from_date,
                    comparison_to=from_date,
                ),
                self._build_comparison(
                    key="average_ticket",
                    label="Ticket promedio",
                    value_type="currency",
                    current=average_ticket,
                    previous=prev_average_ticket,
                    comparison_from=previous_from_date,
                    comparison_to=from_date,
                ),
            ],
            health=HealthResponse(
                pending_orders_count=health_counts["pending_orders_count"],
                cancelled_orders_count=health_counts["cancelled_orders_count"],
                rejected_payments_count=health_counts["rejected_payments_count"],
                stuck_orders_count=health_counts["stuck_orders_count"],
                stuck_threshold_minutes=stuck_minutes,
                stuck_threshold_source=threshold_source,
            ),
            category_insights=self._build_category_insights(category_insights, gross_revenue),
            recent_sales=[
                RecentSaleResponse(
                    order_id=row[0],
                    order_number=row[1],
                    customer_name=row[2],
                    total_amount=f"{row[3]:.2f}",
                    state_code=row[4],
                    payment_status_code=row[5],
                    approved_at=to_utc_iso(row[6] if row[6].tzinfo else row[6].replace(tzinfo=UTC)),
                )
                for row in recent_sales
            ],
            operational_alerts=self._build_operational_alerts(health_counts),
        )

    def _build_category_insights(
        self,
        rows: list[tuple[int, str, Decimal, int]],
        total_revenue: Decimal,
    ) -> list[CategoryInsightResponse]:
        items: list[CategoryInsightResponse] = []
        for category_id, category_name, revenue, order_count in rows:
            share = Decimal("0.0")
            if total_revenue > 0:
                share = ((revenue / total_revenue) * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            items.append(
                CategoryInsightResponse(
                    category_id=category_id,
                    category_name=category_name,
                    gross_revenue=f"{revenue:.2f}",
                    order_count=order_count,
                    revenue_share_percent=f"{share:.1f}",
                )
            )
        return items

    def _build_operational_alerts(self, health_counts: dict[str, int]) -> list[OperationalAlertResponse]:
        alerts: list[OperationalAlertResponse] = []
        pending = health_counts["pending_orders_count"]
        rejected = health_counts["rejected_payments_count"]
        stuck = health_counts["stuck_orders_count"]
        cancelled = health_counts["cancelled_orders_count"]

        if stuck > 0:
            alerts.append(OperationalAlertResponse(severity="high", alert_type="stuck_orders", count=stuck, message=f"{stuck} pedidos trabados requieren seguimiento inmediato."))
        if rejected > 0:
            alerts.append(OperationalAlertResponse(severity="medium", alert_type="rejected_payments", count=rejected, message=f"{rejected} pagos rechazados en el período activo."))
        if pending >= 5:
            alerts.append(OperationalAlertResponse(severity="medium", alert_type="pending_backlog", count=pending, message=f"Backlog de {pending} pedidos pendientes."))
        if cancelled >= 3:
            alerts.append(OperationalAlertResponse(severity="low", alert_type="cancelled_spike", count=cancelled, message=f"{cancelled} pedidos cancelados detectados."))

        return alerts

    def _resolve_range(self, query: DashboardMetricsQuery, timezone: ZoneInfo) -> dict[str, datetime | date]:
        now_local_date = utc_now().astimezone(timezone).date()
        from_date: date
        to_date: date

        if query.from_at is None and query.to is None:
            from_date = now_local_date - timedelta(days=29)
            to_date = now_local_date + timedelta(days=1)
        else:
            from_date = self._parse_local_date(query.from_at, timezone) if query.from_at else (now_local_date - timedelta(days=29))
            to_date = self._parse_local_date(query.to, timezone) if query.to else (now_local_date + timedelta(days=1))

        if from_date >= to_date:
            raise admin_dashboard_invalid_filters(detail="Invalid range: from must be earlier than to.")

        from_local = datetime.combine(from_date, datetime.min.time(), tzinfo=timezone)
        to_local = datetime.combine(to_date, datetime.min.time(), tzinfo=timezone)
        return {
            "from_date": from_date,
            "to_date": to_date,
            "from_utc": from_local.astimezone(UTC),
            "to_utc": to_local.astimezone(UTC),
        }

    def _parse_local_date(self, raw_value: str, timezone: ZoneInfo) -> date:
        try:
            if "T" in raw_value:
                parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone)
                return parsed.astimezone(timezone).date()
            return date.fromisoformat(raw_value)
        except ValueError as error:
            raise admin_dashboard_invalid_filters(detail="Invalid date format. Use YYYY-MM-DD or ISO 8601.") from error

    def _previous_window(self, from_date: date, to_date: date) -> tuple[date, date]:
        duration_days = (to_date - from_date).days
        return from_date - timedelta(days=duration_days), from_date

    def _build_comparison(
        self,
        *,
        key: str,
        label: str,
        value_type: str,
        current: Decimal,
        previous: Decimal,
        comparison_from: date,
        comparison_to: date,
    ) -> KpiComparisonResponse:
        delta_absolute = current - previous
        has_previous = previous > 0
        delta_percent: Decimal | None = None
        trend: str | None = None

        if has_previous:
            delta_percent = ((delta_absolute / abs(previous)) * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            if delta_absolute == 0 or abs(delta_percent) < Decimal("0.5"):
                trend = "flat"
            elif delta_percent >= Decimal("0.5"):
                trend = "up"
            elif delta_percent <= Decimal("-0.5"):
                trend = "down"
            else:
                trend = "flat"

        if value_type == "count":
            current_value = str(int(current))
            previous_value = str(int(previous))
            delta_absolute_value = str(int(delta_absolute))
        else:
            current_value = f"{current:.2f}"
            previous_value = f"{previous:.2f}"
            delta_absolute_value = f"{delta_absolute:.2f}"

        unavailable_reason = None if has_previous else "previous_period_unavailable"

        return KpiComparisonResponse(
            key=key,
            label=label,
            value_type=value_type,
            current_value=current_value,
            previous_value=previous_value,
            delta_absolute=delta_absolute_value,
            delta_percent=f"{delta_percent:.1f}" if delta_percent is not None else None,
            trend=trend,
            comparison_from=comparison_from.isoformat(),
            comparison_to=comparison_to.isoformat(),
            is_comparable=has_previous,
            unavailable_reason=unavailable_reason,
        )

    def _iter_buckets(self, from_date: date, to_date: date, granularity: str) -> list[tuple[date, date, str]]:
        buckets: list[tuple[date, date, str]] = []
        current = from_date
        while current < to_date:
            if granularity == "day":
                nxt = current + timedelta(days=1)
                label = current.strftime("%Y-%m-%d")
            elif granularity == "week":
                nxt = current + timedelta(days=7)
                year, week_number, _ = current.isocalendar()
                label = f"{year}-W{week_number:02d}"
            else:
                if current.month == 12:
                    nxt = date(current.year + 1, 1, 1)
                else:
                    nxt = date(current.year, current.month + 1, 1)
                label = current.strftime("%Y-%m")
            if nxt > to_date:
                nxt = to_date
            buckets.append((current, nxt, label))
            current = nxt
        return buckets

    def _count_buckets(self, from_date: date, to_date: date, granularity: str) -> int:
        return len(self._iter_buckets(from_date, to_date, granularity))

    def _group_sales(
        self,
        *,
        sales_events: list[tuple[datetime, Decimal, int]],
        granularity: str,
        timezone: ZoneInfo,
        from_date: date,
        to_date: date,
    ) -> list[SalesByPeriodBucketResponse]:
        rollup: dict[str, tuple[Decimal, int]] = {}
        for occurred_at, revenue, order_count in sales_events:
            local_dt = occurred_at if occurred_at.tzinfo else occurred_at.replace(tzinfo=UTC)
            local_dt = local_dt.astimezone(timezone)
            if granularity == "day":
                key = local_dt.strftime("%Y-%m-%d")
            elif granularity == "week":
                year, week_number, _ = local_dt.isocalendar()
                key = f"{year}-W{week_number:02d}"
            else:
                key = local_dt.strftime("%Y-%m")
            current_revenue, current_orders = rollup.get(key, (Decimal("0.00"), 0))
            rollup[key] = (current_revenue + revenue, current_orders + order_count)

        items: list[SalesByPeriodBucketResponse] = []
        for bucket_start_date, bucket_end_date, label in self._iter_buckets(from_date, to_date, granularity):
            revenue, orders = rollup.get(label, (Decimal("0.00"), 0))
            # Only include buckets that have at least one order (sale)
            if orders > 0:
                bucket_start = datetime.combine(bucket_start_date, datetime.min.time(), tzinfo=timezone).astimezone(UTC)
                bucket_end = datetime.combine(bucket_end_date, datetime.min.time(), tzinfo=timezone).astimezone(UTC)
                items.append(
                    SalesByPeriodBucketResponse(
                        bucket_start=to_utc_iso(bucket_start),
                        bucket_end=to_utc_iso(bucket_end),
                        label=label,
                        gross_revenue=f"{revenue:.2f}",
                        order_count=orders,
                    )
                )
        return items


admin_dashboard_metrics_service = AdminDashboardMetricsService()
