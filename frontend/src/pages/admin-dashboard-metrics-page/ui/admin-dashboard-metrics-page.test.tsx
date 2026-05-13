import { render, screen } from '@testing-library/react'

import { useAdminDashboardMetricsQuery } from '@/features/admin-dashboard-metrics/model/hooks'
import { AdminDashboardMetricsPage } from '@/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page'

vi.mock('@/features/admin-dashboard-metrics/model/hooks', () => ({
  useAdminDashboardMetricsQuery: vi.fn(),
}))

describe('AdminDashboardMetricsPage', () => {
  beforeEach(() => {
    vi.mocked(useAdminDashboardMetricsQuery).mockReset()
  })

  it('renders dashboard metrics sections', () => {
    vi.mocked(useAdminDashboardMetricsQuery).mockReturnValue({
      data: {
        effective_filters: {
          from_utc: '2026-05-01T00:00:00Z',
          to_utc: '2026-05-30T23:59:59Z',
          granularity: 'day',
          timezone: 'America/Argentina/Buenos_Aires',
        },
        summary: {
          gross_approved_revenue: '1200.00',
          counted_orders: 8,
          average_ticket: '150.00',
          pending_operational_count: 2,
        },
        sales_by_period: [{ label: '2026-05-10', gross_revenue: '600.00', order_count: 4 }],
        top_products: [{ product_id: 1, product_slug: 'pizza', display_name: 'Pizza', units_sold: 10, gross_revenue: '500.00', order_count: 4 }],
        orders_by_state: [{ state_code: 'PENDIENTE', state_name: 'Pendiente', count: 2 }],
      },
      isLoading: false,
      isError: false,
    } as never)

    render(<AdminDashboardMetricsPage />)

    expect(screen.getByRole('heading', { name: /Dashboard de métricas/i })).toBeInTheDocument()
    expect(screen.getByText(/Ingresos aprobados/i)).toBeInTheDocument()
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('2026-05-10')).toBeInTheDocument()
  })
})
