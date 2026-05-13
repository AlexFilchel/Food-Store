import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useOperationsOrderQuery, useOperationsOrderTransitionMutation } from '@/features/orders/model/hooks'
import { AdminOrderDetailPage } from '@/pages/admin-order-detail-page/ui/admin-order-detail-page'

vi.mock('@/features/orders/model/hooks', () => ({
  useOperationsOrderQuery: vi.fn(),
  useOperationsOrderTransitionMutation: vi.fn(),
}))

describe('AdminOrderDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useOperationsOrderQuery).mockReset()
    vi.mocked(useOperationsOrderTransitionMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never)
  })

  it('renders operational order detail with actions', () => {
    vi.mocked(useOperationsOrderQuery).mockReturnValue({
      data: {
        order: {
          id: 202,
          order_number: 'ORD-000202',
          state_code: 'CONFIRMADO',
          state: 'Confirmado',
          payment_method: 'MercadoPago',
          subtotal: '70.00',
          notes: null,
          created_at: '2026-05-12T10:00:00Z',
          updated_at: '2026-05-12T10:00:00Z',
        },
        customer: {
          id: 9,
          first_name: 'Ada',
          last_name: 'Lovelace',
          full_name: 'Ada Lovelace',
          email: 'ada@example.com',
        },
        delivery_address: {
          recipient_name: 'Ada Lovelace',
          phone: '+5491112345678',
          street: 'Av Siempre Viva',
          street_number: '742',
          floor: null,
          apartment: null,
          city: 'CABA',
          province: 'Buenos Aires',
          postal_code: '1000',
          reference: null,
        },
        items: [
          {
            id: 1,
            product_id: 2,
            product_name: 'Burger',
            product_slug: 'burger',
            unit_price: '35.00',
            quantity: 2,
            line_total: '70.00',
            removed_ingredients: [],
          },
        ],
        payment: {
          payment_id: 1,
          status: 'Pendiente',
          status_code: 'PENDING',
          amount: '70.00',
          attempts: 1,
          failure_reason: null,
          retry_allowed: true,
          provider_reference: null,
          last_synced_at: '2026-05-12T10:00:00Z',
        },
        history: [],
        allowed_actions: ['EN_PREPARACION'],
      },
      isLoading: false,
      isError: false,
    } as never)

    render(
      <MemoryRouter initialEntries={['/admin/orders/202']}>
        <Routes>
          <Route path="/admin/orders/:orderId" element={<AdminOrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /ORD-000202/i })).toBeInTheDocument()
    expect(screen.getByText(/Acciones disponibles/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pasar a preparación/i })).toBeInTheDocument()
  })
})
