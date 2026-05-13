from pydantic import BaseModel, ConfigDict, Field


class DashboardMetricsQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")

    from_at: str | None = None
    to: str | None = None
    granularity: str = Field(default="day")
    timezone: str = Field(default="America/Argentina/Buenos_Aires")


class EffectiveFiltersResponse(BaseModel):
    from_utc: str
    to_utc: str
    granularity: str
    timezone: str


class SummaryKpisResponse(BaseModel):
    gross_approved_revenue: str
    counted_orders: int
    average_ticket: str
    pending_operational_count: int


class SalesByPeriodBucketResponse(BaseModel):
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


class DashboardMetricsResponse(BaseModel):
    effective_filters: EffectiveFiltersResponse
    summary: SummaryKpisResponse
    sales_by_period: list[SalesByPeriodBucketResponse]
    top_products: list[TopProductResponse]
    orders_by_state: list[OrdersByStateResponse]
