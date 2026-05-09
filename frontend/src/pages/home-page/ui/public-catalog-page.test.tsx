import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { createAppRouter } from '@/app/router'
import { publicCatalogClient } from '@/entities/public-catalog/api/public-catalog-client'
import { HomePage } from '@/pages/home-page/ui/home-page'

vi.mock('@/entities/public-catalog/api/public-catalog-client', () => ({
  publicCatalogClient: {
    list: vi.fn(),
    detail: vi.fn(),
  },
}))

function renderWithRouter(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const router = createAppRouter({ initialEntries: [path] })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('Public catalog pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders list success and allows anonymous access on home', async () => {
    vi.mocked(publicCatalogClient.list).mockResolvedValue({
      items: [
        {
          id: 1,
          name: 'Burger Pro',
          slug: 'burger-pro',
          description: 'Con cheddar',
          price: '22.00',
          categories: [{ id: 10, name: 'Combos', slug: 'combos' }],
          ingredients: [],
        },
      ],
      total: 1,
      page: 1,
      size: 12,
      pages: 1,
    })

    renderWithRouter('/')

    expect(await screen.findByRole('heading', { name: 'Catálogo público' })).toBeInTheDocument()
    expect(await screen.findByText('Burger Pro')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/catalog/products/burger-pro')
  })

  it('renders loading, error and empty states', async () => {
    vi.mocked(publicCatalogClient.list).mockImplementationOnce(
      () => new Promise(() => undefined),
    )
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HomePage />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Cargando catálogo...')).toBeInTheDocument()

    vi.mocked(publicCatalogClient.list).mockRejectedValueOnce(new Error('network'))
    const errorRouter = createMemoryRouter([{ path: '/', element: <HomePage /> }], { initialEntries: ['/'] })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={errorRouter} />
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el catálogo público.')

    vi.mocked(publicCatalogClient.list).mockResolvedValueOnce({ items: [], total: 0, page: 1, size: 12, pages: 0 })
    const emptyRouter = createMemoryRouter([{ path: '/', element: <HomePage /> }], { initialEntries: ['/'] })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={emptyRouter} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('No encontramos productos disponibles con esos filtros.')).toBeInTheDocument()
  })

  it('updates public query when filters change', async () => {
    vi.mocked(publicCatalogClient.list).mockResolvedValue({ items: [], total: 0, page: 1, size: 12, pages: 0 })
    renderWithRouter('/')

    expect(await screen.findByRole('heading', { name: 'Catálogo público' })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Buscar productos'), 'pizza')
    await user.type(screen.getByLabelText('Filtrar por categoría'), '7')

    await waitFor(() => {
      expect(publicCatalogClient.list).toHaveBeenLastCalledWith({
        page: 1,
        size: 12,
        search: 'pizza',
        category_id: 7,
      })
    })
  })

  it('renders public product detail success and not-found', async () => {
    vi.mocked(publicCatalogClient.list).mockResolvedValue({ items: [], total: 0, page: 1, size: 12, pages: 0 })
    vi.mocked(publicCatalogClient.detail).mockResolvedValueOnce({
      id: 1,
      name: 'Mila Napolitana',
      slug: 'mila-napolitana',
      description: 'Con salsa y queso',
      price: '30.00',
      categories: [{ id: 1, name: 'Platos', slug: 'platos' }],
      ingredients: [{ ingredient_id: 1, name: 'Queso', slug: 'queso', is_removable: true }],
    })

    renderWithRouter('/catalog/products/mila-napolitana')
    expect(await screen.findByRole('heading', { name: 'Mila Napolitana' })).toBeInTheDocument()
    expect(screen.getByText(/Queso · Removible/)).toBeInTheDocument()

    vi.mocked(publicCatalogClient.detail).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    })
    renderWithRouter('/catalog/products/no-existe')
    expect(await screen.findByRole('heading', { name: 'Producto no encontrado' })).toBeInTheDocument()
  })
})
