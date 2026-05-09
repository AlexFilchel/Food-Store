import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosAdapter, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { RouterProvider } from 'react-router-dom'

import { createAppRouter } from '@/app/router'
import { authClient } from '@/shared/api/auth-client'
import { httpClient } from '@/shared/api/http-client'
import { customerProfileClient } from '@/entities/customer-profile/api/customer-profile-client'
import { useFeedbackStore } from '@/shared/stores/feedback-store'
import type { AuthUser } from '@/shared/stores/auth-store'
import { useAuthStore } from '@/shared/stores/auth-store'

vi.mock('@/entities/health/api/get-health', () => ({
  getHealth: () => Promise.resolve({
    status: 'ok',
    service: 'food-store-api',
    timestamp: '2026-05-06T00:00:00Z',
  }),
}))

vi.mock('@/entities/categories/api/category-client', () => ({
  categoryClient: {
    list: () => Promise.resolve({ items: [], total: 0, page: 1, size: 50, pages: 0 }),
    tree: () => Promise.resolve([]),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('@/entities/ingredients/api/ingredient-client', () => ({
  ingredientClient: {
    listIngredients: () => Promise.resolve({ items: [], total: 0, page: 1, size: 50, pages: 0 }),
    getIngredient: vi.fn(),
    createIngredient: vi.fn(),
    updateIngredient: vi.fn(),
    deleteIngredient: vi.fn(),
    listAllergens: () => Promise.resolve({ items: [], total: 0, page: 1, size: 50, pages: 0 }),
    getAllergen: vi.fn(),
    createAllergen: vi.fn(),
    updateAllergen: vi.fn(),
    deleteAllergen: vi.fn(),
  },
}))

vi.mock('@/entities/products/api/product-client', () => ({
  productClient: {
    list: () => Promise.resolve({ items: [], total: 0, page: 1, size: 50, pages: 0 }),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('@/entities/public-catalog/api/public-catalog-client', () => ({
  publicCatalogClient: {
    list: () => Promise.resolve({ items: [], total: 0, page: 1, size: 12, pages: 0 }),
    detail: vi.fn(),
  },
}))

vi.mock('@/entities/customer-profile/api/customer-profile-client', () => ({
  customerProfileClient: {
    get: vi.fn(),
    update: vi.fn(),
    changePassword: vi.fn(),
  },
}))

const clientUser: AuthUser = {
  id: 1,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  roles: ['CLIENT'],
  created_at: '2026-05-06T00:00:00Z',
}

const adminUser: AuthUser = {
  ...clientUser,
  id: 2,
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

const stockUser: AuthUser = {
  ...clientUser,
  id: 3,
  email: 'stock@example.com',
  roles: ['STOCK'],
}

const ordersUser: AuthUser = {
  ...clientUser,
  id: 4,
  email: 'orders@example.com',
  roles: ['PEDIDOS'],
}

function authProblem(status = 401): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed',
    toJSON: () => ({}),
    response: {
      status,
      statusText: status === 401 ? 'Unauthorized' : 'Forbidden',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
      data: {
        title: status === 401 ? 'Unauthorized' : 'Forbidden',
        detail: status === 401 ? 'Session expired' : 'Access denied',
        status,
        code: status === 401 ? 'AUTH_REQUIRED' : 'FORBIDDEN',
      },
    },
    config: {} as InternalAxiosRequestConfig,
  }
}

function httpFailure(status: number, config: InternalAxiosRequestConfig): AxiosError {
  return {
    ...authProblem(status),
    config,
    response: {
      status,
      statusText: status === 403 ? 'Forbidden' : 'Server Error',
      headers: {},
      config,
      data: {
        title: 'Internal metadata that must stay hidden',
        detail: 'accessToken=secret-access refreshToken=secret-refresh security_context=internal',
        status,
        code: status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR',
      },
    },
  }
}

function renderRouter(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createAppRouter({ initialEntries })} />
    </QueryClientProvider>,
  )
}

describe('AppRouter access control', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().clear()
    useFeedbackStore.getState().clearError()
    vi.restoreAllMocks()
    vi.mocked(customerProfileClient.get).mockResolvedValue(clientUser)
  })

  it('renders the public home route without requiring an access token', async () => {
    renderRouter(['/'])

    expect(await screen.findByRole('heading', { name: /Catálogo público/i })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('renders a direct public product detail route without requiring an access token', async () => {
    const { publicCatalogClient } = await import('@/entities/public-catalog/api/public-catalog-client')
    vi.mocked(publicCatalogClient.detail).mockResolvedValue({
      id: 1,
      name: 'Mila Napolitana',
      slug: 'mila-napolitana',
      description: 'Con salsa y queso',
      price: '30.00',
      categories: [{ id: 1, name: 'Platos', slug: 'platos' }],
      ingredients: [{ ingredient_id: 1, name: 'Queso', slug: 'queso', is_removable: true }],
    })

    renderRouter(['/catalog/products/mila-napolitana'])

    expect(await screen.findByRole('heading', { name: 'Mila Napolitana' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('redirects anonymous users away from protected routes', async () => {
    renderRouter(['/app'])

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('bootstraps a persisted session before rendering protected content', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: null })

    renderRouter(['/app'])

    expect(screen.getByText('Validando sesión...')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()
  })

  it('clears an invalid persisted session and redirects to login', async () => {
    vi.spyOn(authClient, 'me').mockRejectedValue(authProblem(401))
    useAuthStore.setState({ accessToken: 'stale-access', refreshToken: 'stale-refresh', user: clientUser })

    renderRouter(['/app'])

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull())
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('allows or denies role-restricted routes based on current roles', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: null })

    const firstRender = renderRouter(['/admin'])
    expect(await screen.findByRole('heading', { name: /No tenés permisos para esta sección/i })).toBeInTheDocument()
    expect(screen.getByText(/shell te protege a nivel de experiencia/i)).toBeInTheDocument()
    expect(screen.getByText(/autorización real sigue estando del lado del backend/i)).toBeInTheDocument()
    firstRender.unmount()

    vi.restoreAllMocks()
    vi.spyOn(authClient, 'me').mockResolvedValue(adminUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: null })

    renderRouter(['/admin'])

    expect(await screen.findByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument()
    await waitFor(() => expect(authClient.me).toHaveBeenCalledTimes(1))

    const adminCategoriesRender = renderRouter(['/admin/categories'])
    expect(await screen.findByRole('heading', { name: 'Gestión de categorías' })).toBeInTheDocument()
    adminCategoriesRender.unmount()
  })

  it.each([
    {
      user: clientUser,
      path: '/app',
      heading: 'Espacio del cliente',
      visible: [/Mi espacio/i],
      hidden: [/Administración/i, /Stock/i, /Pedidos/i],
    },
    {
      user: adminUser,
      path: '/admin',
      heading: 'Panel de administración',
      visible: [/Mi espacio/i, /Administración/i, /Categorías/i, /Ingredientes/i, /Productos/i, /Stock/i, /Pedidos/i],
      hidden: [],
    },
    {
      user: stockUser,
      path: '/stock',
      heading: 'Centro de stock',
      visible: [/Stock/i],
      hidden: [/Mi espacio/i, /Administración/i, /Pedidos/i],
    },
    {
      user: ordersUser,
      path: '/orders',
      heading: 'Mesa operativa de pedidos',
      visible: [/Pedidos/i],
      hidden: [/Mi espacio/i, /Administración/i, /Stock/i],
    },
  ])('renders role-aware navigation for $user.roles', async ({ user, path, heading, visible, hidden }) => {
    vi.spyOn(authClient, 'me').mockResolvedValue(user)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user })

    renderRouter([path])

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()

    for (const linkName of visible) {
      expect(screen.getAllByRole('link', { name: linkName }).length).toBeGreaterThan(0)
    }

    for (const linkName of hidden) {
      expect(screen.queryByRole('link', { name: linkName })).not.toBeInTheDocument()
    }
  })

  it('blocks non-admin users from the category management route', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: clientUser })

    renderRouter(['/admin/categories'])

    expect(await screen.findByRole('heading', { name: /No tenés permisos para esta sección/i })).toBeInTheDocument()
  })

  it('blocks non-admin users from the ingredient management route', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: clientUser })

    renderRouter(['/admin/ingredients'])

    expect(await screen.findByRole('heading', { name: /No tenés permisos para esta sección/i })).toBeInTheDocument()
  })

  it('blocks non-admin users from the product management route', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: clientUser })

    renderRouter(['/admin/products'])

    expect(await screen.findByRole('heading', { name: /No tenés permisos para esta sección/i })).toBeInTheDocument()
  })

  it('renders accessible navigation controls, active route state and logout affordances', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(stockUser)
    vi.spyOn(authClient, 'logout').mockResolvedValue(undefined)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: stockUser })

    const user = userEvent.setup()
    renderRouter(['/stock'])

    expect(await screen.findByRole('heading', { name: 'Centro de stock' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Stock/i })).toHaveAttribute('aria-current', 'page')

    const menuButton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(menuButton).toHaveAttribute('aria-controls', 'mobile-navigation')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    await user.click(menuButton)

    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Navegación móvil' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cerrar sesión' })).toHaveLength(2)
  })

  it('handles unrecoverable HTTP 401 by clearing auth state and showing the expired-session login experience', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: clientUser })
    const originalAdapter = httpClient.defaults.adapter
    httpClient.defaults.adapter = ((config) => Promise.reject(httpFailure(401, { ...config, _retry: true } as InternalAxiosRequestConfig))) as AxiosAdapter

    try {
      renderRouter(['/app'])

      expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()

      await act(async () => {
        await httpClient.get('/api/v1/protected/resource', { _retry: true } as never).catch(() => undefined)
      })

      expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('Sesión expirada')
      await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull())
    } finally {
      httpClient.defaults.adapter = originalAdapter
    }
  })

  it('handles HTTP 403 globally with an access-denied experience', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(adminUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: adminUser })
    const originalAdapter = httpClient.defaults.adapter
    httpClient.defaults.adapter = ((config) => Promise.reject(httpFailure(403, config))) as AxiosAdapter

    try {
      renderRouter(['/admin'])

      expect(await screen.findByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument()

      await act(async () => {
        await httpClient.get('/api/v1/admin/secure').catch(() => undefined)
      })

      expect(await screen.findByRole('heading', { name: /No tenés permisos para esta sección/i })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('Acceso denegado')
    } finally {
      httpClient.defaults.adapter = originalAdapter
    }
  })

  it('shows recoverable API failure feedback without crashing the shell or leaking sensitive metadata', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: clientUser })
    const originalAdapter = httpClient.defaults.adapter
    httpClient.defaults.adapter = ((config) => Promise.reject(httpFailure(500, config))) as AxiosAdapter

    try {
      renderRouter(['/app'])

      expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()

      await act(async () => {
        await httpClient.get('/api/v1/recoverable-failure').catch(() => undefined)
      })

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Error del servidor')
      expect(alert).toHaveTextContent('Hubo un problema al comunicarse con el servidor')
      expect(screen.getByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()
      expect(screen.queryByText(/secret-access/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/secret-refresh/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/security_context/i)).not.toBeInTheDocument()
    } finally {
      httpClient.defaults.adapter = originalAdapter
    }
  })
})
