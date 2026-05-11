import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { vi } from 'vitest'

import { createAppRouter } from '@/app/router'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useCartStore } from '@/shared/stores/cart-store'

const preflightMock = vi.fn()

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

    await user.click(screen.getByRole('button', { name: 'Continuar al checkout' }))
    expect(screen.getByRole('status')).toHaveTextContent('Necesitás iniciar sesión para continuar al checkout.')
    expect(preflightMock).not.toHaveBeenCalled()

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

  it('calls checkout preflight for authenticated users with mapped payload and default address', async () => {
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

    renderCartRoute()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Continuar al checkout' }))

    expect(preflightMock).toHaveBeenCalledWith({
      items: [{ product_id: 5, quantity: 2, removed_ingredient_ids: [3] }],
      delivery_address_id: 10,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Preflight validado. Subtotal confirmado: $44.00')
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('does not call preflight when cart is empty', async () => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'refresh', user: null })
    renderCartRoute()

    expect(screen.queryByRole('button', { name: 'Continuar al checkout' })).not.toBeInTheDocument()
    expect(preflightMock).not.toHaveBeenCalled()
  })
})
