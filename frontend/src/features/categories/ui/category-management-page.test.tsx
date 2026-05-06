import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { categoryClient } from '@/entities/categories/api/category-client'
import { CategoryManagementPage } from '@/features/categories/ui/category-management-page'

vi.mock('@/entities/categories/api/category-client', () => ({
  categoryClient: {
    list: vi.fn(),
    tree: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

const rootCategory = {
  id: 1,
  name: 'Bebidas',
  slug: 'bebidas',
  description: 'Todo para tomar',
  parent_id: null,
  sort_order: 0,
  is_active: true,
  created_at: '2026-05-06T00:00:00Z',
  updated_at: '2026-05-06T00:00:00Z',
}

const childCategory = {
  id: 2,
  name: 'Gaseosas',
  slug: 'gaseosas',
  description: 'Con gas',
  parent_id: 1,
  sort_order: 1,
  is_active: true,
  created_at: '2026-05-06T00:00:00Z',
  updated_at: '2026-05-06T00:00:00Z',
  children: [],
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <CategoryManagementPage />
    </QueryClientProvider>,
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })

  return { promise, resolve }
}

describe('CategoryManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading states and then renders list and tree data', async () => {
    const listDeferred = deferred<{ items: Array<typeof rootCategory | typeof childCategory>; total: number; page: number; size: number; pages: number }>()
    const treeDeferred = deferred<Array<typeof rootCategory & { children: typeof childCategory[] }>>()
    vi.mocked(categoryClient.list).mockReturnValueOnce(listDeferred.promise)
    vi.mocked(categoryClient.tree).mockReturnValueOnce(treeDeferred.promise)

    renderPage()

    expect(screen.getByText('Cargando categorías...')).toBeInTheDocument()
    expect(screen.getByText('Cargando árbol de categorías...')).toBeInTheDocument()

    listDeferred.resolve({ items: [rootCategory, childCategory], total: 2, page: 1, size: 50, pages: 1 })
    treeDeferred.resolve([{ ...rootCategory, children: [childCategory] }])

    expect(await screen.findByRole('heading', { name: 'Lista administrativa' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Árbol jerárquico' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Categoría padre' })).toBeInTheDocument()
  })

  it('creates a category and refetches list and tree queries', async () => {
    vi.mocked(categoryClient.list)
      .mockResolvedValueOnce({ items: [rootCategory], total: 1, page: 1, size: 50, pages: 1 })
      .mockResolvedValueOnce({ items: [rootCategory, childCategory], total: 2, page: 1, size: 50, pages: 1 })
    vi.mocked(categoryClient.tree)
      .mockResolvedValueOnce([{ ...rootCategory, children: [] }])
      .mockResolvedValueOnce([{ ...rootCategory, children: [childCategory] }])
    vi.mocked(categoryClient.create).mockResolvedValue(childCategory)

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Lista administrativa' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nombre'), 'Gaseosas')
    await user.type(screen.getByLabelText('Descripción'), 'Con gas')
    await user.selectOptions(screen.getByLabelText('Categoría padre'), '1')
    await user.type(screen.getByLabelText('Orden'), '1')
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }))

    await waitFor(() =>
      expect(vi.mocked(categoryClient.create).mock.calls[0]?.[0]).toEqual({
        name: 'Gaseosas',
        description: 'Con gas',
        parent_id: 1,
        sort_order: 1,
        is_active: true,
      }),
    )
    await waitFor(() => expect(categoryClient.list).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(categoryClient.tree).toHaveBeenCalledTimes(2))
    expect(await screen.findAllByText('Gaseosas')).toHaveLength(2)
  })

  it('edits and deletes categories with targeted feedback', async () => {
    vi.mocked(categoryClient.list)
      .mockResolvedValueOnce({ items: [rootCategory, childCategory], total: 2, page: 1, size: 50, pages: 1 })
      .mockResolvedValueOnce({
        items: [{ ...childCategory, name: 'Gaseosas Zero', slug: 'gaseosas-zero' }, rootCategory],
        total: 2,
        page: 1,
        size: 50,
        pages: 1,
      })
      .mockResolvedValueOnce({ items: [rootCategory], total: 1, page: 1, size: 50, pages: 1 })
    vi.mocked(categoryClient.tree)
      .mockResolvedValueOnce([{ ...rootCategory, children: [childCategory] }])
      .mockResolvedValueOnce([{ ...rootCategory, children: [{ ...childCategory, name: 'Gaseosas Zero', slug: 'gaseosas-zero', children: [] }] }])
      .mockResolvedValueOnce([{ ...rootCategory, children: [] }])
    vi.mocked(categoryClient.update).mockResolvedValue({ ...childCategory, name: 'Gaseosas Zero', slug: 'gaseosas-zero' })
    vi.mocked(categoryClient.remove).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findAllByRole('button', { name: 'Editar' })).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[1])
    const nameInput = screen.getByLabelText('Nombre')
    await user.clear(nameInput)
    await user.type(nameInput, 'Gaseosas Zero')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(categoryClient.update).toHaveBeenCalledWith(2, expect.objectContaining({ name: 'Gaseosas Zero' })))
    expect(await screen.findAllByText('gaseosas-zero')).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0])
    await waitFor(() => expect(vi.mocked(categoryClient.remove).mock.calls[0]?.[0]).toBe(2))
    await waitFor(() => expect(categoryClient.list).toHaveBeenCalledTimes(3))
  })

  it('preserves form state on duplicate or hierarchy validation errors', async () => {
    vi.mocked(categoryClient.list).mockResolvedValue({ items: [rootCategory, childCategory], total: 2, page: 1, size: 50, pages: 1 })
    vi.mocked(categoryClient.tree).mockResolvedValue([{ ...rootCategory, children: [childCategory] }])
    vi.mocked(categoryClient.create).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          title: 'Duplicate Category',
          detail: 'Otra categoría activa ya usa ese nombre.',
          status: 409,
          code: 'CATEGORY_DUPLICATE',
        },
      },
    })
    vi.mocked(categoryClient.update).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          title: 'Category Cycle Detected',
          detail: 'La jerarquía generaría un ciclo.',
          status: 409,
          code: 'CATEGORY_CYCLE_DETECTED',
          errors: [{ field: 'body.parent_id', message: 'No podés mover una categoría debajo de uno de sus descendientes.' }],
        },
      },
    })

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findAllByRole('button', { name: 'Editar' })).toHaveLength(2)

    await user.type(screen.getByLabelText('Nombre'), 'Gaseosas')
    await user.selectOptions(screen.getByLabelText('Categoría padre'), '1')
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Otra categoría activa ya usa ese nombre.')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Gaseosas')

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[1])
    await user.selectOptions(screen.getByLabelText('Categoría padre'), '1')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('No podés mover una categoría debajo de uno de sus descendientes.')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría padre')).toHaveValue('1')
  })

  it('shows delete restriction errors without breaking the current screen', async () => {
    vi.mocked(categoryClient.list).mockResolvedValue({ items: [rootCategory], total: 1, page: 1, size: 50, pages: 1 })
    vi.mocked(categoryClient.tree).mockResolvedValue([{ ...rootCategory, children: [] }])
    vi.mocked(categoryClient.remove).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          title: 'Category Has Active Children',
          detail: 'La categoría todavía tiene hijas activas.',
          status: 409,
          code: 'CATEGORY_HAS_CHILDREN',
        },
      },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La categoría todavía tiene hijas activas.')
    expect(screen.getByRole('heading', { name: 'Gestión de categorías' })).toBeInTheDocument()
  })
})
