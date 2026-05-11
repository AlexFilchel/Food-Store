import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { AppPage } from '@/pages/app-page/ui/app-page'
import { customerProfileClient } from '@/entities/customer-profile/api/customer-profile-client'
import { deliveryAddressClient } from '@/entities/delivery-addresses/api/delivery-address-client'
import { useAuthStore } from '@/shared/stores/auth-store'

vi.mock('@/entities/customer-profile/api/customer-profile-client', () => ({
  customerProfileClient: {
    get: vi.fn(),
    update: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('@/entities/delivery-addresses/api/delivery-address-client', () => ({
  deliveryAddressClient: {
    list: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setDefault: vi.fn(),
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

const address = {
  id: 1,
  recipient_name: 'Grace Hopper',
  phone: '+5491112345678',
  street: 'Calle 1',
  street_number: '123',
  floor: null,
  apartment: null,
  city: 'CABA',
  province: 'Buenos Aires',
  postal_code: '1000',
  reference: null,
  is_default: true,
  created_at: '2026-05-06T00:00:00Z',
  updated_at: '2026-05-06T00:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AppPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

async function selectProvince(user: ReturnType<typeof userEvent.setup>, query: string, province: string) {
  const provinceInput = screen.getByRole('combobox', { name: 'Provincia' })
  await user.clear(provinceInput)
  await user.click(provinceInput)
  if (query) {
    await user.type(provinceInput, query)
  }
  await user.click(screen.getByRole('option', { name: province }))
}

describe('AppPage customer profile and addresses', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clear()
    vi.mocked(customerProfileClient.get).mockResolvedValue(profile)
    vi.mocked(deliveryAddressClient.list).mockResolvedValue([])
  })

  it('renders authenticated customer profile content', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Espacio del cliente' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mis direcciones de entrega' })).toBeInTheDocument()
  })

  it('renders loading state for address list', async () => {
    vi.mocked(deliveryAddressClient.list).mockImplementationOnce(() => new Promise(() => undefined))

    renderPage()

    expect(await screen.findByText('Cargando direcciones...')).toBeInTheDocument()
  })

  it('renders empty/error states for address list', async () => {
    renderPage()
    expect(await screen.findByText('Todavía no tenés direcciones guardadas.')).toBeInTheDocument()

    vi.mocked(deliveryAddressClient.list).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: { detail: 'Fallo API', code: 'SERVER_ERROR', status: 500, title: 'Error' } },
    })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo API')
  })

  it('creates address and resets form', async () => {
    vi.mocked(deliveryAddressClient.create).mockResolvedValue(address)
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Mis direcciones de entrega' })
    await user.type(screen.getByLabelText('Destinatario'), 'Grace Hopper')
    await user.type(screen.getByLabelText('Teléfono'), '+5491112345678')
    await user.type(screen.getByLabelText('Calle'), 'Calle 1')
    await user.type(screen.getByLabelText('Número'), '123')
    await user.type(screen.getByLabelText('Ciudad'), 'CABA')
    await selectProvince(user, 'Buenos', 'Buenos Aires')
    await user.type(screen.getByLabelText('Código postal'), '1000')
    await user.click(screen.getByRole('button', { name: 'Agregar dirección' }))

    await waitFor(() => expect(deliveryAddressClient.create).toHaveBeenCalled())
    expect(screen.getByLabelText('Destinatario')).toHaveValue('')
  })

  it('updates, deletes and marks default with single visible default', async () => {
    const secondAddress = { ...address, id: 2, is_default: false, street_number: '124' }
    vi.mocked(deliveryAddressClient.list)
      .mockResolvedValueOnce([address, secondAddress])
      .mockResolvedValue([{ ...address, is_default: false }, { ...secondAddress, is_default: true }])
    vi.mocked(deliveryAddressClient.update).mockResolvedValue({ ...address, city: 'Rosario' })
    vi.mocked(deliveryAddressClient.remove).mockResolvedValue(undefined)
    vi.mocked(deliveryAddressClient.setDefault).mockResolvedValue({ ...secondAddress, is_default: true })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Calle 1 123, CABA')
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    await user.clear(screen.getByLabelText('Ciudad'))
    await user.type(screen.getByLabelText('Ciudad'), 'Rosario')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(deliveryAddressClient.update).toHaveBeenCalled())
    await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0])
    await waitFor(() => expect(deliveryAddressClient.remove).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Marcar como predeterminada' }))
    await waitFor(() => expect(deliveryAddressClient.setDefault).toHaveBeenCalled())
    await waitFor(() => expect(vi.mocked(deliveryAddressClient.list).mock.calls.length).toBeGreaterThanOrEqual(2))

    expect(screen.getAllByText('Predeterminada')).toHaveLength(1)
    const secondCard = screen.getByText('Calle 1 124, CABA').closest('div')
    expect(secondCard).not.toBeNull()
    expect(within(secondCard as HTMLElement).getByText('Predeterminada')).toBeInTheDocument()
  })

  it('preserves address form on validation errors without sensitive leaks', async () => {
    vi.mocked(deliveryAddressClient.create).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          title: 'Validation Error',
          detail: 'The request contains invalid fields.',
          status: 422,
          code: 'VALIDATION_ERROR',
          errors: [{ field: 'body.recipient_name', message: 'String should have at least 1 character' }],
          accessToken: 'secret',
        },
      },
    })

    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Mis direcciones de entrega' })
    await user.type(screen.getByLabelText('Destinatario'), 'X')
    await selectProvince(user, 'Buenos', 'Buenos Aires')
    await user.click(screen.getByRole('button', { name: 'Agregar dirección' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Destinatario')).toHaveValue('X')
    expect(screen.queryByText(/accessToken/i)).not.toBeInTheDocument()
  })

  it('requires selecting an Argentine province from a prefix-filtered list', async () => {
    vi.mocked(deliveryAddressClient.create).mockResolvedValue({ ...address, province: 'Mendoza' })
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Mis direcciones de entrega' })
    await user.click(screen.getByRole('combobox', { name: 'Provincia' }))
    expect(screen.getByRole('option', { name: 'Mendoza' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Buenos Aires' })).toBeInTheDocument()

    await user.type(screen.getByRole('combobox', { name: 'Provincia' }), 'Men')
    expect(screen.getByRole('option', { name: 'Mendoza' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Buenos Aires' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Agregar dirección' }))
    expect(await screen.findByText('Seleccioná una provincia de la lista.')).toBeInTheDocument()
    expect(deliveryAddressClient.create).not.toHaveBeenCalled()

    await user.click(screen.getByRole('option', { name: 'Mendoza' }))
    await user.type(screen.getByLabelText('Destinatario'), 'Grace Hopper')
    await user.type(screen.getByLabelText('Teléfono'), '+5491112345678')
    await user.type(screen.getByLabelText('Calle'), 'Calle 1')
    await user.type(screen.getByLabelText('Número'), '123')
    await user.type(screen.getByLabelText('Ciudad'), 'Godoy Cruz')
    await user.type(screen.getByLabelText('Código postal'), '5501')
    await user.click(screen.getByRole('button', { name: 'Agregar dirección' }))

    await waitFor(() => expect(deliveryAddressClient.create).toHaveBeenCalledWith(expect.objectContaining({ province: 'Mendoza' })))
  })

  it('clears stale address validation errors before editing successfully', async () => {
    vi.mocked(deliveryAddressClient.list).mockResolvedValue([address])
    vi.mocked(deliveryAddressClient.create).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          title: 'Validation Error',
          detail: 'The request contains invalid fields.',
          status: 422,
          code: 'VALIDATION_ERROR',
          errors: [{ field: 'body.recipient_name', message: 'String should have at least 1 character' }],
        },
      },
    })
    vi.mocked(deliveryAddressClient.update).mockResolvedValue({ ...address, city: 'Rosario' })

    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Calle 1 123, CABA')
    await selectProvince(user, 'Buenos', 'Buenos Aires')
    await user.click(screen.getByRole('button', { name: 'Agregar dirección' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The request contains invalid fields.')
    expect(screen.getByText('String should have at least 1 character')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('String should have at least 1 character')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Ciudad'))
    await user.type(screen.getByLabelText('Ciudad'), 'Rosario')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(deliveryAddressClient.update).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Dirección guardada correctamente.')).toBeInTheDocument()
  })
})
