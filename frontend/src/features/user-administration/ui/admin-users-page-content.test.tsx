import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AdminUsersPageContent } from '@/features/user-administration/ui/admin-users-page-content'
import { useAdminUserCreateMutation, useAdminUsersListQuery } from '@/features/user-administration/model/hooks'

vi.mock('@/features/user-administration/model/hooks', () => ({
  useAdminUsersListQuery: vi.fn(),
  useAdminUserCreateMutation: vi.fn(),
}))

describe('AdminUsersPageContent', () => {
  beforeEach(() => {
    vi.mocked(useAdminUsersListQuery).mockReset()
    vi.mocked(useAdminUserCreateMutation).mockReset()
  })

  it('renders loading state', () => {
    vi.mocked(useAdminUserCreateMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never)
    vi.mocked(useAdminUsersListQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never)

    render(<AdminUsersPageContent />)

    expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    vi.mocked(useAdminUserCreateMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never)
    vi.mocked(useAdminUsersListQuery).mockReturnValue({
      data: { items: [], total: 0, page: 1, size: 20, pages: 0 },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    render(<AdminUsersPageContent />)

    expect(screen.getByText('No hay usuarios para mostrar')).toBeInTheDocument()
  })

  it('renders users list', () => {
    vi.mocked(useAdminUserCreateMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never)
    vi.mocked(useAdminUsersListQuery).mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            is_active: true,
            roles: ['ADMIN'],
            created_at: '2026-05-12T00:00:00Z',
            updated_at: '2026-05-12T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        size: 20,
        pages: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    render(<AdminUsersPageContent />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('submits create user form and invalidates query', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      id: 99,
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com',
      is_active: true,
      roles: ['ADMIN'],
      created_at: '2026-05-12T00:00:00Z',
      updated_at: '2026-05-12T00:00:00Z',
      deleted_at: null,
    })

    vi.mocked(useAdminUserCreateMutation).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never)
    vi.mocked(useAdminUsersListQuery).mockReturnValue({
      data: { items: [], total: 0, page: 1, size: 20, pages: 0 },
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    render(<AdminUsersPageContent />)

    const user = userEvent.setup()
    const nameInputs = screen.getAllByLabelText('Nombre')
    const lastNameInputs = screen.getAllByLabelText('Apellido')
    const emailInputs = screen.getAllByLabelText('Email')
    const passwordInputs = screen.getAllByLabelText('Contraseña')

    await user.type(nameInputs[nameInputs.length - 1], 'Admin')
    await user.type(lastNameInputs[lastNameInputs.length - 1], 'User')
    await user.type(emailInputs[emailInputs.length - 1], 'admin@example.com')
    await user.type(passwordInputs[passwordInputs.length - 1], 'StrongPass123!')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(mutateAsync).toHaveBeenCalled()
  })

  it('renders error state on forbidden response', () => {
    vi.mocked(useAdminUserCreateMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never)
    vi.mocked(useAdminUsersListQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 403, data: { title: 'Forbidden', detail: 'Access denied', status: 403, code: 'FORBIDDEN' } } },
    } as never)

    render(<AdminUsersPageContent />)

    expect(screen.getByText('No tenés permisos para acceder a la administración de usuarios.')).toBeInTheDocument()
  })
})
