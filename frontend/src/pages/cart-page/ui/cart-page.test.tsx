import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { vi } from 'vitest'

import { createAppRouter } from '@/app/router'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useCartStore } from '@/shared/stores/cart-store'

const preflightMock = vi.fn()
const createOrderMock = vi.fn()
const initPaymentMock = vi.fn()

vi.mock('@/features/checkout/model/hooks', () => ({
  useCheckoutPreflightMutation: () => ({
    mutateAsync: preflightMock,
  }),
}))

vi.mock('@/features/delivery-addresses/model/hooks', () => ({
  useDeliveryAddressListQuery: () => ({
    data: [
      {
        id: 10,
        recipient_name: 'Ada',
        phone: '123',
        street: 'Siempre Viva',
        street_number: '742',
        floor: null,
        apartment: null,
        city: 'CABA',
        province: 'BA',
        postal_code: '1000',
        reference: null,
        is_default: true,
        created_at: '',
        updated_at: '',
      },
    ],
  }),
}))

vi.mock('@/features/orders/model/hooks', () => ({
  useCreateOrderMutation: () => ({
    mutateAsync: createOrderMock,
    isPending: false,
  }),
}))

vi.mock('@/features/payments/model/hooks', () => ({
  useInitPaymentMutation: () => ({
    mutateAsync: initPaymentMock,
    isPending: false,
  }),
}))

function renderCartRoute() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={createAppRouter({ initialEntries: ['/cart'] })} />
    </QueryClientProvider>,
  )
}

describe('CartPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.getState().clear()
    useAuthStore.getState().clear()
    preflightMock.mockReset()
    createOrderMock.mockReset()
    initPaymentMock.mockReset()
  })

  it('renders an empty cart state with a path back to the catalog', async () => {
    renderCartRoute()

    expect(await screen.findByRole('heading', { name: 'Tu carrito' })).toBeInTheDocument()
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al catálogo' })).toHaveAttribute('href', '/')
  })

  it('renders populated cart lines and allows quantity updates, removal, clear and checkout login-gated feedback', async () => {
    useCartStore.getState().addItem({
      productId: 1,
      slug: 'burger-pro',
      name: 'Burger Pro',
      unitPrice: '22.00',
      quantity: 2,
      removedIngredients: [{ id: 3, name: 'Cebolla' }],
    })

    renderCartRoute()

    expect(await screen.findByText('Burger Pro')).toBeInTheDocument()
    expect(screen.getByText('Sin Cebolla.')).toBeInTheDocument()
    expect(screen.getByText('$44.00')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '+' }))
    expect(screen.getByLabelText('Cantidad de Burger Pro')).toHaveValue('3')
    expect(screen.getByText('$66.00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(screen.getByRole('status')).toHaveTextContent('Necesitás iniciar sesión para continuar al checkout.')
    expect(preflightMock).not.toHaveBeenCalled()
    expect(createOrderMock).not.toHaveBeenCalled()
    expect(initPaymentMock).not.toHaveBeenCalled()

    await act(async () => {
      useCartStore.getState().addItem({
        productId: 2,
        slug: 'pizza',
        name: 'Pizza',
        unitPrice: '18.50',
        quantity: 1,
        removedIngredients: [],
      })
    })
    expect(await screen.findByText('Pizza')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Vaciar carrito' }))
    expect(screen.getByRole('status')).toHaveTextContent('Se vació el carrito.')
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()

  })

  it('creates the order, initializes payment and confirms redirect feedback for authenticated users', async () => {
    useCartStore.getState().addItem({
      productId: 5,
      slug: 'burger-pro',
      name: 'Burger Pro',
      unitPrice: '22.00',
      quantity: 2,
      removedIngredients: [{ id: 3, name: 'Cebolla' }],
    })
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'refresh', user: null })
    preflightMock.mockResolvedValue({ subtotal: '44.00' })
    createOrderMock.mockResolvedValue({ id: 99, order_number: 'ORD-99' })
    initPaymentMock.mockResolvedValue({
      payment_id: 123,
      preference_id: 'pref-123',
      init_point: 'https://www.mercadopago.com/init',
      sandbox_init_point: 'https://sandbox.mercadopago.com/init',
      external_reference: 'order-99',
    })
    const redirectTimerSpy = vi.spyOn(window, 'setTimeout')

    renderCartRoute()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Confirmar pedido' }))

    expect(preflightMock).toHaveBeenCalledWith({
      items: [{ product_id: 5, quantity: 2, removed_ingredient_ids: [3] }],
      delivery_address_id: 10,
    })
    expect(createOrderMock).toHaveBeenCalledWith({
      items: [{ product_id: 5, quantity: 2, removed_ingredient_ids: [3] }],
      delivery_address_id: 10,
      payment_method_code: 'MERCADOPAGO',
    })
    expect(initPaymentMock).toHaveBeenCalledWith({ order_id: 99 })
    expect(await screen.findByRole('status')).toHaveTextContent('Pedido ORD-99 creado. Redirigiendo a MercadoPago...')
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(redirectTimerSpy).toHaveBeenCalledWith(expect.any(Function), 1500)
    redirectTimerSpy.mockRestore()
  })

  it('does not call preflight when cart is empty', async () => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'refresh', user: null })
    renderCartRoute()

    expect(screen.queryByRole('button', { name: 'Confirmar pedido' })).not.toBeInTheDocument()
    expect(preflightMock).not.toHaveBeenCalled()
    expect(createOrderMock).not.toHaveBeenCalled()
    expect(initPaymentMock).not.toHaveBeenCalled()
  })
})
