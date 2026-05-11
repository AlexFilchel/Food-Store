import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ingredientClient } from '@/entities/ingredients/api/ingredient-client'
import { IngredientManagementPage } from '@/features/ingredients/ui/ingredient-management-page'

vi.mock('@/entities/ingredients/api/ingredient-client', () => ({
  ingredientClient: {
    listIngredients: vi.fn(),
    getIngredient: vi.fn(),
    createIngredient: vi.fn(),
    updateIngredient: vi.fn(),
    deleteIngredient: vi.fn(),
    listAllergens: vi.fn(),
    getAllergen: vi.fn(),
    createAllergen: vi.fn(),
    updateAllergen: vi.fn(),
    deleteAllergen: vi.fn(),
  },
}))

const gluten = { id: 1, name: 'Gluten', slug: 'gluten', description: null, is_active: true, created_at: '', updated_at: '' }
const lacteos = { id: 2, name: 'Lácteos', slug: 'lacteos', description: null, is_active: true, created_at: '', updated_at: '' }
const pan = { id: 1, name: 'Pan', slug: 'pan', description: 'Harina', is_active: true, created_at: '', updated_at: '', allergens: [{ id: 1, name: 'Gluten', slug: 'gluten' }] }

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <IngredientManagementPage />
    </QueryClientProvider>,
  )
}

function mockLists() {
  vi.mocked(ingredientClient.listIngredients).mockResolvedValue({ items: [pan], total: 1, page: 1, size: 50, pages: 1 })
  vi.mocked(ingredientClient.listAllergens).mockResolvedValue({ items: [gluten, lacteos], total: 2, page: 1, size: 50, pages: 1 })
}

function problem(detail: string) {
  return {
    isAxiosError: true,
    response: {
      status: 409,
      data: { title: 'Conflict', detail, status: 409, code: 'TEST_ERROR' },
    },
  }
}

describe('IngredientManagementPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads and shows ingredient/allergen data', async () => {
    mockLists()

    renderPage()

    expect(await screen.findByText('Pan')).toBeInTheDocument()
    expect(screen.getAllByText('Gluten').length).toBeGreaterThan(0)
  })

  it('creates ingredient and allergen with invalidation', async () => {
    vi.mocked(ingredientClient.listIngredients).mockResolvedValue({ items: [], total: 0, page: 1, size: 50, pages: 0 })
    vi.mocked(ingredientClient.listAllergens).mockResolvedValue({ items: [lacteos], total: 1, page: 1, size: 50, pages: 1 })
    vi.mocked(ingredientClient.createIngredient).mockResolvedValue({ id: 1, name: 'Queso', slug: 'queso', description: null, is_active: true, created_at: '', updated_at: '', allergens: [] })
    vi.mocked(ingredientClient.createAllergen).mockResolvedValue({ id: 3, name: 'Soja', slug: 'soja', description: null, is_active: true, created_at: '', updated_at: '' })

    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Gestión de ingredientes')

    await user.type(screen.getByLabelText('Nombre ingrediente'), 'Queso')
    await user.click(screen.getByLabelText('Lácteos'))
    await user.click(screen.getByRole('button', { name: 'Crear ingrediente' }))

    await waitFor(() => expect(ingredientClient.createIngredient).toHaveBeenCalledWith({ name: 'Queso', description: null, is_active: true, allergen_ids: [2] }))

    await user.type(screen.getByLabelText('Nombre alérgeno'), 'Soja')
    await user.click(screen.getByRole('button', { name: 'Crear alérgeno' }))
    await waitFor(() => expect(ingredientClient.createAllergen).toHaveBeenCalledWith({ name: 'Soja', description: null, is_active: true }))
  })

  it('edits ingredient and allergen without losing associations', async () => {
    mockLists()
    vi.mocked(ingredientClient.updateIngredient).mockResolvedValue({ ...pan, name: 'Pan integral', allergens: [{ id: 2, name: 'Lácteos', slug: 'lacteos' }] })
    vi.mocked(ingredientClient.updateAllergen).mockResolvedValue({ ...gluten, name: 'Gluten actualizado' })

    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Pan')

    await user.click(screen.getAllByRole('button', { name: 'Editar ingrediente' })[0])
    await user.clear(screen.getByLabelText('Nombre ingrediente'))
    await user.type(screen.getByLabelText('Nombre ingrediente'), 'Pan integral')
    await user.click(screen.getByLabelText('Gluten'))
    await user.click(screen.getByLabelText('Lácteos'))
    await user.click(screen.getByRole('button', { name: 'Guardar ingrediente' }))

    await waitFor(() => expect(ingredientClient.updateIngredient).toHaveBeenCalledWith(1, {
      name: 'Pan integral',
      description: 'Harina',
      is_active: true,
      allergen_ids: [2],
    }))

    await user.click(screen.getAllByRole('button', { name: 'Editar alérgeno' })[0])
    await user.clear(screen.getByLabelText('Nombre alérgeno'))
    await user.type(screen.getByLabelText('Nombre alérgeno'), 'Gluten actualizado')
    await user.click(screen.getByRole('button', { name: 'Guardar alérgeno' }))

    await waitFor(() => expect(ingredientClient.updateAllergen).toHaveBeenCalledWith(1, {
      name: 'Gluten actualizado',
      description: null,
      is_active: true,
    }))
  })

  it('preserves form state when backend validation fails', async () => {
    mockLists()
    vi.mocked(ingredientClient.createIngredient).mockRejectedValue(problem('Ya existe un ingrediente activo con ese nombre.'))
    vi.mocked(ingredientClient.deleteAllergen).mockRejectedValue(problem('El alérgeno está en uso.'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Pan')

    await user.type(screen.getByLabelText('Nombre ingrediente'), 'Pan')
    await user.click(screen.getByRole('button', { name: 'Crear ingrediente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un ingrediente activo con ese nombre.')
    expect(screen.getByLabelText('Nombre ingrediente')).toHaveValue('Pan')

    await user.click(screen.getAllByRole('button', { name: 'Eliminar alérgeno' })[0])
    expect(await screen.findByRole('alert')).toHaveTextContent('El alérgeno está en uso.')
  })
})
