from pydantic import BaseModel, ConfigDict, Field


class DashboardMetricsQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")

    from_at: str | None = None
    to: str | None = None
    granularity: str = Field(default="day")
    timezone: str | None = Field(default=None)


class EffectiveFiltersResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_at: str = Field(alias="from", serialization_alias="from")
    to: str
    from_utc: str
    to_utc: str
    granularity: str
    timezone: str


class KpiComparisonResponse(BaseModel):
    key: str
    label: str
    value_type: str
    current_value: str
    previous_value: str | None
    delta_absolute: str | None
    delta_percent: str | None
    trend: str | None
    comparison_from: str
    comparison_to: str
    is_comparable: bool
    unavailable_reason: str | None


class HealthResponse(BaseModel):
    pending_orders_count: int
    cancelled_orders_count: int
    rejected_payments_count: int
    stuck_orders_count: int
    stuck_threshold_minutes: int
    stuck_threshold_source: str


class SummaryKpisResponse(BaseModel):
    gross_approved_revenue: str
    counted_orders: int
    average_ticket: str
    pending_operational_count: int


class SalesByPeriodBucketResponse(BaseModel):
    bucket_start: str | None = None
    bucket_end: str | None = None
    label: str
    gross_revenue: str
    order_count: int


class TopProductResponse(BaseModel):
    product_id: int | None
    product_slug: str | None
    display_name: str
    units_sold: int
    gross_revenue: str
    order_count: int


class OrdersByStateResponse(BaseModel):
    state_code: str
    state_name: str
    count: int


class CategoryInsightResponse(BaseModel):
    category_id: int
    category_name: str
    gross_revenue: str
    order_count: int
    revenue_share_percent: str


class RecentSaleResponse(BaseModel):
    order_id: int
    order_number: str
    customer_name: str
    total_amount: str
    state_code: str
    payment_status_code: str
    approved_at: str


class OperationalAlertResponse(BaseModel):
    severity: str
    alert_type: str
    count: int
    message: str


class DashboardMetricsResponse(BaseModel):
    effective_filters: EffectiveFiltersResponse
    summary: SummaryKpisResponse
    sales_by_period: list[SalesByPeriodBucketResponse]
    top_products: list[TopProductResponse]
    orders_by_state: list[OrdersByStateResponse]
    kpi_comparisons: list[KpiComparisonResponse] | None = None
    health: HealthResponse | None = None
    category_insights: list[CategoryInsightResponse] | None = None
    recent_sales: list[RecentSaleResponse] | None = None
    operational_alerts: list[OperationalAlertResponse] | None = None
