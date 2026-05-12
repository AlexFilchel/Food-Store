import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useOrderQuery } from '@/features/orders/model/hooks'
import { useRetryPaymentMutation } from '@/features/payments/model/hooks'
import { OrderDetailPage } from '@/pages/order-detail-page/ui/order-detail-page'

vi.mock('@/features/orders/model/hooks', () => ({
  useOrderQuery: vi.fn(),
}))

vi.mock('@/features/payments/model/hooks', () => ({
  useRetryPaymentMutation: vi.fn(),
}))

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useOrderQuery).mockReset()
    vi.mocked(useRetryPaymentMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never)
  })

  it('shows a safe not-found state for 403 or 404 detail failures', () => {
    vi.mocked(useOrderQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never)

    render(
      <MemoryRouter initialEntries={['/orders/404']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Pedido no encontrado/i })).toBeInTheDocument()
    expect(screen.getByText(/No pudimos encontrar el pedido que buscas/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver a pedidos/i })).toHaveAttribute('href', '/orders')
    expect(screen.queryByText(/accessToken|refreshToken|security_context/i)).not.toBeInTheDocument()
  })
})
