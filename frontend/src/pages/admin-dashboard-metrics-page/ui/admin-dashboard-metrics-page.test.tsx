import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { useAdminDashboardMetricsQuery } from '@/features/admin-dashboard-metrics/model/hooks'
import { AdminDashboardMetricsPage } from '@/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page'

vi.mock('@/features/admin-dashboard-metrics/model/hooks', () => ({
  useAdminDashboardMetricsQuery: vi.fn(),
}))

vi.mock('@/shared/config/env', () => ({
  appEnv: {
    appName: 'Food Store',
    apiUrl: 'http://localhost:8000',
    mpPublicKey: 'TEST',
    adminDashboardUxUpgrade: true,
    adminDashboardUxUpgradeTrends: true,
  },
}))

describe('AdminDashboardMetricsPage', () => {
  beforeEach(() => {
    vi.mocked(useAdminDashboardMetricsQuery).mockReset()
    localStorage.clear()
  })

  it('renders real category/recent/alerts sections and real chart mode', () => {
    localStorage.setItem('admin.dashboard.view.v1', JSON.stringify({ version: 1, preset: 'last_7_days', timezone: 'America/Argentina/Buenos_Aires', view_mode: 'chart' }))
    vi.mocked(useAdminDashboardMetricsQuery).mockReturnValue({
      data: {
        effective_filters: { from: '2026-05-01', to: '2026-05-08', from_utc: '2026-05-01T00:00:00Z', to_utc: '2026-05-08T00:00:00Z', granularity: 'day', timezone: 'America/Argentina/Buenos_Aires' },
        summary: { gross_approved_revenue: '1200.00', counted_orders: 8, average_ticket: '150.00', pending_operational_count: 2 },
        sales_by_period: [
          { label: '2026-05-06', gross_revenue: '200.00', order_count: 2, bucket_start: '2026-05-06T00:00:00Z', bucket_end: '2026-05-07T00:00:00Z' },
          { label: '2026-05-07', gross_revenue: '600.00', order_count: 4, bucket_start: '2026-05-07T00:00:00Z', bucket_end: '2026-05-08T00:00:00Z' },
        ],
        top_products: [{ product_id: 1, product_slug: 'pizza', display_name: 'Pizza', units_sold: 10, gross_revenue: '500.00', order_count: 4 }],
        orders_by_state: [{ state_code: 'PENDIENTE', state_name: 'Pendiente', count: 2 }],
        kpi_comparisons: [{ key: 'gross_approved_revenue', label: 'Ventas aprobadas', value_type: 'currency', current_value: '1200.00', previous_value: '1000.00', delta_absolute: '200.00', delta_percent: '20.0', trend: 'up', comparison_from: '2026-04-24', comparison_to: '2026-05-01', is_comparable: true, unavailable_reason: null }],
        health: { pending_orders_count: 3, cancelled_orders_count: 1, rejected_payments_count: 2, stuck_orders_count: 1, stuck_threshold_minutes: 30, stuck_threshold_source: 'default' },
        category_insights: [{ category_id: 1, category_name: 'Pizzas', gross_revenue: '900.00', order_count: 6, revenue_share_percent: '75.0' }],
        recent_sales: [{ order_id: 11, order_number: 'ORD-11', customer_name: 'Ada Lovelace', total_amount: '250.00', state_code: 'CONFIRMADO', payment_status_code: 'APPROVED', approved_at: '2026-05-07T11:00:00Z' }],
        operational_alerts: [{ severity: 'high', alert_type: 'stuck_orders', count: 1, message: '1 pedido trabado requiere seguimiento inmediato.' }],
      },
      isLoading: false,
      isError: false,
    } as never)

    render(<MemoryRouter><AdminDashboardMetricsPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: /Dashboard de métricas/i })).toBeInTheDocument()
    expect(screen.getByText('Pizzas')).toBeInTheDocument()
    expect(screen.getByText('ORD-11')).toBeInTheDocument()
    expect(screen.getByText(/pedido trabado/i)).toBeInTheDocument()
    expect(screen.queryByText(/no disponibles en esta versión del contrato/i)).not.toBeInTheDocument()
  })

  it('normalizes category pie shares using revenue totals when backend percentages are inconsistent', () => {
    localStorage.setItem('admin.dashboard.view.v1', JSON.stringify({ version: 1, preset: 'last_7_days', timezone: 'America/Argentina/Buenos_Aires', view_mode: 'chart' }))
    vi.mocked(useAdminDashboardMetricsQuery).mockReturnValue({
      data: {
        effective_filters: { from: '2026-05-01', to: '2026-05-08', from_utc: '2026-05-01T00:00:00Z', to_utc: '2026-05-08T00:00:00Z', granularity: 'day', timezone: 'America/Argentina/Buenos_Aires' },
        summary: { gross_approved_revenue: '15000.00', counted_orders: 12, average_ticket: '1250.00', pending_operational_count: 0 },
        sales_by_period: [],
        top_products: [],
        orders_by_state: [],
        category_insights: [
          { category_id: 1, category_name: 'Pizzas', gross_revenue: '5000.00', order_count: 4, revenue_share_percent: '100.0' },
          { category_id: 2, category_name: 'Hamburguesas', gross_revenue: '5000.00', order_count: 4, revenue_share_percent: '100.0' },
          { category_id: 3, category_name: 'Pizza a la piedra', gross_revenue: '5000.00', order_count: 4, revenue_share_percent: '100.0' },
        ],
        recent_sales: [],
        operational_alerts: [],
      },
      isLoading: false,
      isError: false,
    } as never)

    render(<MemoryRouter><AdminDashboardMetricsPage /></MemoryRouter>)

    expect(screen.getAllByText('33.3%')).toHaveLength(3)
    expect(screen.queryByText('100.0%')).not.toBeInTheDocument()
  })
})
