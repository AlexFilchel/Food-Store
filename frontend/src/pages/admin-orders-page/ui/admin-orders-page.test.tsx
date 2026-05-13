import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { useOperationsOrderListQuery } from '@/features/orders/model/hooks'
import { AdminOrdersPage } from '@/pages/admin-orders-page/ui/admin-orders-page'

vi.mock('@/features/orders/model/hooks', () => ({
  useOperationsOrderListQuery: vi.fn(),
}))

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    vi.mocked(useOperationsOrderListQuery).mockReset()
  })

  it('renders operational orders list for admins', () => {
    vi.mocked(useOperationsOrderListQuery).mockReturnValue({
      data: {
        items: [
          {
            id: 101,
            order_number: 'ORD-000101',
            state_code: 'CONFIRMADO',
            state: 'Confirmado',
            customer_name: 'Ada Lovelace',
            customer_email: 'ada@example.com',
            payment_status: 'Aprobado',
            payment_status_code: 'APPROVED',
            subtotal: '45.00',
            created_at: '2026-05-12T10:00:00Z',
          },
        ],
        total: 1,
        skip: 0,
        limit: 10,
      },
      isLoading: false,
      isError: false,
    } as never)

    render(
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Pedidos operativos/i })).toBeInTheDocument()
    expect(screen.getByText('ORD-000101')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver detalle/i })).toHaveAttribute('href', '/admin/orders/101')
  })
})
