import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { usePaymentByExternalReferenceQuery } from '@/features/payments/model/hooks'
import { PaymentResultPage } from '@/pages/payment-result-page/ui/payment-result-page'

vi.mock('@/features/payments/model/hooks', () => ({
  usePaymentByExternalReferenceQuery: vi.fn(),
}))

function paymentResult(overrides = {}) {
  return {
    payment_id: 1,
    order_id: 55,
    status: 'Aprobado',
    mp_payment_id: 'mp-order-55',
    amount: '22.00',
    attempts: 1,
    failure_reason: null,
    retry_allowed: false,
    created_at: '2026-05-12T00:00:00Z',
    updated_at: '2026-05-12T00:00:00Z',
    ...overrides,
  }
}

function renderPaymentResultPage() {
  render(
    <MemoryRouter initialEntries={['/payment/result?external_reference=order-55']}>
      <Routes>
        <Route path="/payment/result" element={<PaymentResultPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PaymentResultPage', () => {
  beforeEach(() => {
    vi.mocked(usePaymentByExternalReferenceQuery).mockReset()
  })

  it('shows unknown feedback when backend result is unavailable', () => {
    vi.mocked(usePaymentByExternalReferenceQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never)

    renderPaymentResultPage()

    expect(screen.getByRole('heading', { name: /No pudimos verificar el pago/i })).toBeInTheDocument()
  })

  it('shows approved feedback with a link to the order detail', () => {
    vi.mocked(usePaymentByExternalReferenceQuery).mockReturnValue({
      data: paymentResult({ status: 'Aprobado' }),
      isLoading: false,
      isError: false,
    } as never)

    renderPaymentResultPage()

    expect(screen.getByRole('heading', { name: /¡Pago aprobado!/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver detalle del pedido/i })).toHaveAttribute('href', '/orders/55')
  })

  it('shows pending feedback without marking the payment as successful', () => {
    vi.mocked(usePaymentByExternalReferenceQuery).mockReturnValue({
      data: paymentResult({ status: 'Pendiente', mp_payment_id: null }),
      isLoading: false,
      isError: false,
    } as never)

    renderPaymentResultPage()

    expect(screen.getByRole('heading', { name: /Pago pendiente/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /¡Pago aprobado!/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ver detalle del pedido/i })).not.toBeInTheDocument()
  })

  it('shows retry action only when backend allows it', () => {
    vi.mocked(usePaymentByExternalReferenceQuery).mockReturnValue({
      data: paymentResult({ status: 'Rechazado', mp_payment_id: null, failure_reason: 'Fondos insuficientes' }),
      isLoading: false,
      isError: false,
    } as never)

    renderPaymentResultPage()

    expect(screen.queryByRole('link', { name: /Reintentar pago/i })).not.toBeInTheDocument()
  })

  it('shows retry action for rejected payments when backend allows it', () => {
    vi.mocked(usePaymentByExternalReferenceQuery).mockReturnValue({
      data: paymentResult({
        status: 'Rechazado',
        mp_payment_id: null,
        failure_reason: 'Fondos insuficientes',
        retry_allowed: true,
      }),
      isLoading: false,
      isError: false,
    } as never)

    renderPaymentResultPage()

    expect(screen.getByRole('heading', { name: /Pago no completado/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reintentar pago/i })).toHaveAttribute('href', '/orders/55')
  })
})
