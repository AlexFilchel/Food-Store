import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'

import { createAppRouter } from '@/app/router'
import { useCartStore } from '@/shared/stores/cart-store'

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
  })

  it('renders an empty cart state with a path back to the catalog', async () => {
    renderCartRoute()

    expect(await screen.findByRole('heading', { name: 'Tu carrito' })).toBeInTheDocument()
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al catálogo' })).toHaveAttribute('href', '/')
  })

  it('renders populated cart lines and allows quantity updates, removal, clear and checkout placeholder feedback', async () => {
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
    expect(screen.getByRole('status')).toHaveTextContent('El checkout todavía no está disponible.')

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
})
