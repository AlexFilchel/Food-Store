import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AdminSystemConfigurationPage } from '@/pages/admin-system-configuration-page/ui/admin-system-configuration-page'

const refetchMock = vi.fn()
const mutateMock = vi.fn()

const useAdminSystemConfigurationQueryMock = vi.fn()
const useAdminSystemConfigurationMutationMock = vi.fn()

vi.mock('@/features/system-configuration/model/hooks', () => ({
  useAdminSystemConfigurationQuery: () => useAdminSystemConfigurationQueryMock(),
  useAdminSystemConfigurationMutation: () => useAdminSystemConfigurationMutationMock(),
}))

function baseItems() {
  return [
    {
      key: 'store.ordering_enabled',
      category: 'store',
      type: 'boolean',
      editable: true,
      visibility: 'admin_only',
      sensitive: false,
      description: 'flag',
      default_value: true,
      effective_value: true,
      is_default_backed: true,
      validation: { min: null, max: null },
      version: 1,
      updated_at: null,
    },
    {
      key: 'orders.max_items_per_order',
      category: 'orders',
      type: 'integer',
      editable: true,
      visibility: 'admin_only',
      sensitive: false,
      description: 'limit',
      default_value: 50,
      effective_value: 50,
      is_default_backed: true,
      validation: { min: 1, max: 200 },
      version: 2,
      updated_at: null,
    },
    {
      key: 'store.public_name',
      category: 'store',
      type: 'string',
      editable: true,
      visibility: 'public',
      sensitive: false,
      description: 'name',
      default_value: 'Food Store',
      effective_value: 'Food Store',
      is_default_backed: true,
      validation: { min: null, max: null },
      version: 0,
      updated_at: null,
    },
  ]
}

describe('AdminSystemConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAdminSystemConfigurationQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { items: baseItems() },
      refetch: refetchMock,
    })
    useAdminSystemConfigurationMutationMock.mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      mutate: mutateMock,
    })
  })

  it('renders typed controls and handles dirty cancel', async () => {
    render(<AdminSystemConfigurationPage />)

    const saveButton = screen.getByRole('button', { name: 'Guardar cambios' })
    const cancelButton = screen.getByRole('button', { name: 'Cancelar' })
    expect(saveButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()

    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('orders.max_items_per_order'))
    await user.type(screen.getByLabelText('orders.max_items_per_order'), '80')

    expect(saveButton).toBeEnabled()
    expect(cancelButton).toBeEnabled()

    await user.click(cancelButton)
    expect(screen.getByLabelText('orders.max_items_per_order')).toHaveValue(50)
    expect(saveButton).toBeDisabled()
  })

  it('requires confirmation for sensitive keys and saves typed values', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminSystemConfigurationPage />)

    const user = userEvent.setup()
    await user.click(screen.getByLabelText('store.ordering_enabled'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(confirmSpy).toHaveBeenCalledOnce()
    expect(mutateMock).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('shows stale conflict guidance with refresh action', async () => {
    useAdminSystemConfigurationMutationMock.mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      mutate: mutateMock,
      error: {
        isAxiosError: true,
        response: { status: 409, data: { code: 'SYSTEM_CONFIGURATION_STALE_VERSION', detail: 'stale' } },
      },
    })

    render(<AdminSystemConfigurationPage />)

    expect(screen.getByText(/cambió en paralelo/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Refrescar configuración' }))
    expect(refetchMock).toHaveBeenCalledOnce()
  })

  it('maps field validation errors while preserving draft value', async () => {
    useAdminSystemConfigurationMutationMock.mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      mutate: mutateMock,
      error: {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            code: 'SYSTEM_CONFIGURATION_VALIDATION_ERROR',
            detail: 'invalid',
            errors: [{ field: 'body.updates.orders.max_items_per_order.value', message: 'Debe ser <= 200' }],
          },
        },
      },
    })

    render(<AdminSystemConfigurationPage />)
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('orders.max_items_per_order'))
    await user.type(screen.getByLabelText('orders.max_items_per_order'), '300')

    expect(screen.getByLabelText('orders.max_items_per_order')).toHaveValue(300)
    expect(screen.getByRole('alert')).toHaveTextContent('Debe ser <= 200')
  })
})
