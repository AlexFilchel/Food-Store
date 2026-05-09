import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AppPage } from '@/pages/app-page/ui/app-page'
import { customerProfileClient } from '@/entities/customer-profile/api/customer-profile-client'
import { useAuthStore } from '@/shared/stores/auth-store'

vi.mock('@/entities/customer-profile/api/customer-profile-client', () => ({
  customerProfileClient: {
    get: vi.fn(),
    update: vi.fn(),
    changePassword: vi.fn(),
  },
}))

const profile = {
  id: 10,
  first_name: 'Grace',
  last_name: 'Hopper',
  email: 'grace@example.com',
  roles: ['CLIENT'],
  created_at: '2026-05-06T00:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AppPage />
    </QueryClientProvider>,
  )
}

describe('AppPage customer profile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clear()
    vi.mocked(customerProfileClient.get).mockResolvedValue(profile)
  })

  it('renders authenticated customer profile content', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
  })

  it('updates profile and syncs auth-store user', async () => {
    vi.mocked(customerProfileClient.update).mockResolvedValue({ ...profile, first_name: 'Ada' })
    const user = userEvent.setup()
    renderPage()

    await screen.findByDisplayValue('Grace')
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(customerProfileClient.update).toHaveBeenCalled())
    expect(useAuthStore.getState().user?.first_name).toBe('Ada')
  })

  it('shows profile errors preserving form values', async () => {
    vi.mocked(customerProfileClient.update).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          title: 'Duplicate Email',
          detail: 'The provided email is already in use.',
          status: 409,
          code: 'CUSTOMER_PROFILE_DUPLICATE_EMAIL',
          accessToken: 'nope',
        },
      },
    })

    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('grace@example.com')
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'taken@example.com')
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The provided email is already in use.')
    expect(screen.getByLabelText('Email')).toHaveValue('taken@example.com')
    expect(screen.queryByText(/accessToken/i)).not.toBeInTheDocument()
  })

  it('clears password fields on successful password change', async () => {
    vi.mocked(customerProfileClient.changePassword).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Cambiar contraseña' })
    await user.type(screen.getByLabelText('Contraseña actual'), 'StrongPass123!')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NewPass12345!')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'NewPass12345!')
    await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))

    await waitFor(() => expect(customerProfileClient.changePassword).toHaveBeenCalled())
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('')
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('')
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toHaveValue('')
  })

  it('blocks password mismatch before API call', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Cambiar contraseña' })
    await user.type(screen.getByLabelText('Contraseña actual'), 'StrongPass123!')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NewPass12345!')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Different123!')
    await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))

    expect(screen.getByRole('alert')).toHaveTextContent('La confirmación no coincide con la nueva contraseña.')
    expect(customerProfileClient.changePassword).not.toHaveBeenCalled()
  })

  it('renders password API errors safely', async () => {
    vi.mocked(customerProfileClient.changePassword).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          title: 'Invalid Current Password',
          detail: 'The current password is incorrect.',
          status: 401,
          code: 'CUSTOMER_PROFILE_INVALID_CURRENT_PASSWORD',
          refreshToken: 'super-secret',
          security_context: { trace: 'internal' },
        },
      },
    })

    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Cambiar contraseña' })

    await user.type(screen.getByLabelText('Contraseña actual'), 'WrongPass123!')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NewPass12345!')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'NewPass12345!')
    await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The current password is incorrect.')
    expect(screen.queryByText(/super-secret/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/security_context/i)).not.toBeInTheDocument()
  })
})
