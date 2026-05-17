export type MetricsGranularity = 'day' | 'week' | 'month'

export interface DashboardMetricsFilters {
  from?: string
  to?: string
  granularity?: MetricsGranularity
  timezone?: string
}

export interface DashboardMetricsResponse {
  effective_filters: {
    from?: string
    to?: string
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
    bucket_start?: string | null
    bucket_end?: string | null
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
  kpi_comparisons?: Array<{
    key: string
    label: string
    value_type: 'currency' | 'count' | string
    current_value: string
    previous_value: string | null
    delta_absolute: string | null
    delta_percent: string | null
    trend: 'up' | 'down' | 'flat' | null
    comparison_from: string
    comparison_to: string
    is_comparable: boolean
    unavailable_reason: string | null
  }>
  health?: {
    pending_orders_count?: number
    cancelled_orders_count?: number
    rejected_payments_count?: number
    stuck_orders_count?: number
    stuck_threshold_minutes?: number
    stuck_threshold_source?: 'system_configuration' | 'default' | string
  }
  category_insights?: Array<{
    category_id: number
    category_name: string
    gross_revenue: string
    order_count: number
    revenue_share_percent: string
  }>
  recent_sales?: Array<{
    order_id: number
    order_number: string
    customer_name: string
    total_amount: string
    state_code: string
    payment_status_code: string
    approved_at: string
  }>
  operational_alerts?: Array<{
    severity: 'high' | 'medium' | 'low' | string
    alert_type: string
    count: number
    message: string
  }>
}
