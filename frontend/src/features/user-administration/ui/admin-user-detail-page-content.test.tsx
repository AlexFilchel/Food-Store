import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { AdminUserDetailPageContent } from '@/features/user-administration/ui/admin-user-detail-page-content'
import {
  useAdminUserDetailQuery,
  useAdminUserLifecycleMutation,
  useAdminUserPasswordResetMutation,
  useAdminUserRoleUpdateMutation,
  useAdminUserUpdateMutation,
} from '@/features/user-administration/model/hooks'

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useParams: () => ({ userId: '10' }),
}))

vi.mock('@/features/user-administration/model/hooks', () => ({
  useAdminUserDetailQuery: vi.fn(),
  useAdminUserUpdateMutation: vi.fn(),
  useAdminUserRoleUpdateMutation: vi.fn(),
  useAdminUserLifecycleMutation: vi.fn(),
  useAdminUserPasswordResetMutation: vi.fn(),
}))

describe('AdminUserDetailPageContent', () => {
  beforeEach(() => {
    vi.mocked(useAdminUserDetailQuery).mockReset()
    vi.mocked(useAdminUserUpdateMutation).mockReset()
    vi.mocked(useAdminUserRoleUpdateMutation).mockReset()
    vi.mocked(useAdminUserLifecycleMutation).mockReset()
    vi.mocked(useAdminUserPasswordResetMutation).mockReset()
  })

  function mockDetail() {
    vi.mocked(useAdminUserDetailQuery).mockReturnValue({
      data: {
        id: 10,
        first_name: 'User',
        last_name: 'Admin',
        full_name: 'User Admin',
        email: 'user-admin@example.com',
        is_active: true,
        roles: ['ADMIN'],
        created_at: '2026-05-12T00:00:00Z',
        updated_at: '2026-05-12T00:00:00Z',
        deleted_at: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as never)
  }

  it('renders detail content and allows lifecycle updates', async () => {
    mockDetail()
    const lifecycleMutation = { mutateAsync: vi.fn(), isPending: false }
    vi.mocked(useAdminUserLifecycleMutation).mockReturnValue(lifecycleMutation as never)
    vi.mocked(useAdminUserUpdateMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserRoleUpdateMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserPasswordResetMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)

    render(
      <MemoryRouter>
        <AdminUserDetailPageContent />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /User Admin/i })).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Desactivar' }))
    expect(lifecycleMutation.mutateAsync).toHaveBeenCalled()
  })

  it('submits password reset', async () => {
    mockDetail()
    const resetMutation = { mutateAsync: vi.fn(), isPending: false }
    vi.mocked(useAdminUserPasswordResetMutation).mockReturnValue(resetMutation as never)
    vi.mocked(useAdminUserUpdateMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserRoleUpdateMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserLifecycleMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)

    render(
      <MemoryRouter>
        <AdminUserDetailPageContent />
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Nueva contraseña'), 'StrongPass123!')
    await user.click(screen.getByRole('button', { name: 'Resetear' }))

    expect(resetMutation.mutateAsync).toHaveBeenCalled()
  })

  it('submits role update', async () => {
    mockDetail()
    const roleMutation = { mutateAsync: vi.fn(), isPending: false }
    vi.mocked(useAdminUserRoleUpdateMutation).mockReturnValue(roleMutation as never)
    vi.mocked(useAdminUserUpdateMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserLifecycleMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserPasswordResetMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)

    render(
      <MemoryRouter>
        <AdminUserDetailPageContent />
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    const roleCheckboxes = screen.getAllByRole('checkbox', { name: /admin|stock|pedidos|cliente/i })
    await user.click(roleCheckboxes[0])
    await user.click(screen.getByRole('button', { name: 'Guardar roles' }))

    expect(roleMutation.mutateAsync).toHaveBeenCalled()
  })

  it('submits profile update', async () => {
    mockDetail()
    const updateMutation = { mutateAsync: vi.fn(), isPending: false }
    vi.mocked(useAdminUserUpdateMutation).mockReturnValue(updateMutation as never)
    vi.mocked(useAdminUserRoleUpdateMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserLifecycleMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useAdminUserPasswordResetMutation).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)

    render(
      <MemoryRouter>
        <AdminUserDetailPageContent />
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    const nameInputs = screen.getAllByLabelText('Nombre')
    await user.clear(nameInputs[0])
    await user.type(nameInputs[0], 'Updated')
    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    expect(updateMutation.mutateAsync).toHaveBeenCalled()
  })
})
