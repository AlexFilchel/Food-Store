export type MetricsGranularity = 'day' | 'week' | 'month'

export interface DashboardMetricsFilters {
  from?: string
  to?: string
  granularity?: MetricsGranularity
  timezone?: string
}

export interface DashboardMetricsResponse {
  effective_filters: {
    from_utc: string
    to_utc: string
    granularity: MetricsGranularity
    timezone: string
  }
  summary: {
    gross_approved_revenue: string
    counted_orders: number
    average_ticket: string
    pending_operational_count: number
  }
  sales_by_period: Array<{
    label: string
    gross_revenue: string
    order_count: number
  }>
  top_products: Array<{
    product_id: number | null
    product_slug: string | null
    display_name: string
    units_sold: number
    gross_revenue: string
    order_count: number
  }>
  orders_by_state: Array<{
    state_code: string
    state_name: string
    count: number
  }>
}
