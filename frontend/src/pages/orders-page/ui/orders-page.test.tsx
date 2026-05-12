import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { useOrderListQuery } from '@/features/orders/model/hooks'
import { OrdersPage } from '@/pages/orders-page/ui/orders-page'

vi.mock('@/features/orders/model/hooks', () => ({
  useOrderListQuery: vi.fn(),
}))

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.mocked(useOrderListQuery).mockReset()
  })

  it('renders authenticated customer order history inside the customer experience', () => {
    vi.mocked(useOrderListQuery).mockReturnValue({
      data: {
        items: [
          {
            id: 55,
            order_number: 'ORD-000055',
            state: 'Confirmado',
            item_count: 2,
            subtotal: '44.00',
            created_at: '2026-05-12T12:00:00Z',
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
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Tus pedidos/i })).toBeInTheDocument()
    expect(screen.getByText('ORD-000055')).toBeInTheDocument()
    expect(screen.getAllByText('Confirmado')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Ver detalle/i })).toHaveAttribute('href', '/orders/55')
  })
})
