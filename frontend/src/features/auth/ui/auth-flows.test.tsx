import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'

import { createAppRouter } from '@/app/router'
import { customerProfileClient } from '@/entities/customer-profile/api/customer-profile-client'
import { authClient } from '@/shared/api/auth-client'
import type { AuthUser } from '@/shared/stores/auth-store'
import { useAuthStore } from '@/shared/stores/auth-store'

const clientUser: AuthUser = {
  id: 10,
  first_name: 'Grace',
  last_name: 'Hopper',
  email: 'grace@example.com',
  roles: ['CLIENT'],
  created_at: '2026-05-06T00:00:00Z',
}

vi.mock('@/entities/customer-profile/api/customer-profile-client', () => ({
  customerProfileClient: {
    get: vi.fn(),
    update: vi.fn(),
    changePassword: vi.fn(),
  },
}))

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

describe('Auth flows', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().clear()
    vi.restoreAllMocks()
  })

  it('logs in and redirects to the authenticated shell', async () => {
    vi.spyOn(authClient, 'login').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_in: 900,
      user: clientUser,
    })
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    vi.mocked(customerProfileClient.get).mockResolvedValue(clientUser)

    const user = userEvent.setup()
    renderRouter(['/login'])

    await user.type(screen.getByLabelText('Email'), 'grace@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'StrongPass123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBe('access')
  })

  it('registers successfully, stores the returned session and redirects to the shell', async () => {
    vi.spyOn(authClient, 'register').mockResolvedValue({
      access_token: 'registered-access',
      refresh_token: 'registered-refresh',
      token_type: 'bearer',
      expires_in: 900,
      user: clientUser,
    })
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    vi.mocked(customerProfileClient.get).mockResolvedValue(clientUser)

    const user = userEvent.setup()
    renderRouter(['/register'])

    await user.type(screen.getByLabelText('Nombre'), 'Grace')
    await user.type(screen.getByLabelText('Apellido'), 'Hopper')
    await user.type(screen.getByLabelText('Email'), 'grace@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'StrongPass123!')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBe('registered-access')
    expect(useAuthStore.getState().refreshToken).toBe('registered-refresh')
    expect(useAuthStore.getState().user?.email).toBe('grace@example.com')
  })

  it('shows login failures without storing a partial session or leaking sensitive metadata', async () => {
    vi.spyOn(authClient, 'login').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          title: 'Unauthorized',
          detail: 'Credenciales inválidas.',
          status: 401,
          code: 'AUTH_FAILED',
          accessToken: 'secret-access-token',
          refreshToken: 'secret-refresh-token',
          security_context: { reason: 'password_mismatch' },
        },
      },
    })

    const user = userEvent.setup()
    renderRouter(['/login'])

    await user.type(screen.getByLabelText('Email'), 'grace@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'WrongPass123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas.')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().refreshToken).toBeNull()
    expect(screen.queryByText(/secret-access-token/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/secret-refresh-token/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/security_context/i)).not.toBeInTheDocument()
  })

  it('shows canonical registration errors without storing a partial session', async () => {
    vi.spyOn(authClient, 'register').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          title: 'Validation Error',
          detail: 'The request contains invalid fields.',
          status: 422,
          code: 'VALIDATION_ERROR',
          errors: [{ field: 'body.password', message: 'String should have at least 8 characters' }],
        },
      },
    })

    const user = userEvent.setup()
    renderRouter(['/register'])

    await user.type(screen.getByLabelText('Nombre'), 'Grace')
    await user.type(screen.getByLabelText('Apellido'), 'Hopper')
    await user.type(screen.getByLabelText('Email'), 'grace@example.com')
    await user.type(screen.getByLabelText('Contraseña'), '123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('String should have at least 8 characters')).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('logs out, clears local session state and returns to a public route', async () => {
    vi.spyOn(authClient, 'me').mockResolvedValue(clientUser)
    vi.spyOn(authClient, 'logout').mockResolvedValue(undefined)
    vi.mocked(customerProfileClient.get).mockResolvedValue(clientUser)
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: clientUser })

    const user = userEvent.setup()
    renderRouter(['/app'])

    expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull())
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(authClient.logout).toHaveBeenCalledWith({ refresh_token: 'refresh' })
  })
})
