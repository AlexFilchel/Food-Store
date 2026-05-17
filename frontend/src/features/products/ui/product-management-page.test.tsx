import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { categoryClient } from '@/entities/categories/api/category-client'
import { ingredientClient } from '@/entities/ingredients/api/ingredient-client'
import { productClient } from '@/entities/products/api/product-client'
import { ProductManagementPage } from '@/features/products/ui/product-management-page'

vi.mock('@/entities/products/api/product-client', () => ({ productClient: { list: vi.fn(), detail: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))
vi.mock('@/entities/categories/api/category-client', () => ({ categoryClient: { list: vi.fn(), tree: vi.fn(), detail: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))
vi.mock('@/entities/ingredients/api/ingredient-client', () => ({ ingredientClient: { listIngredients: vi.fn(), getIngredient: vi.fn(), createIngredient: vi.fn(), updateIngredient: vi.fn(), deleteIngredient: vi.fn(), listAllergens: vi.fn(), getAllergen: vi.fn(), createAllergen: vi.fn(), updateAllergen: vi.fn(), deleteAllergen: vi.fn() } }))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><ProductManagementPage /></QueryClientProvider>)
}

describe('ProductManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productClient.list).mockResolvedValue({ items: [], total: 0, page: 1, size: 50, pages: 0 })
    vi.mocked(categoryClient.list).mockResolvedValue({ items: [{ id: 1, name: 'Bebidas', slug: 'bebidas', description: null, parent_id: null, sort_order: 0, is_active: true, created_at: '', updated_at: '' }], total: 1, page: 1, size: 100, pages: 1 })
    vi.mocked(ingredientClient.listIngredients).mockResolvedValue({ items: [{ id: 1, name: 'Azúcar', slug: 'azucar', description: null, is_active: true, created_at: '', updated_at: '', allergens: [] }], total: 1, page: 1, size: 100, pages: 1 })
  })

  it('creates a product and keeps filters controls', async () => {
    vi.mocked(productClient.create).mockResolvedValue({ id: 1, name: 'Coca Cola', slug: 'coca-cola', description: null, price: '10.50', stock_quantity: 5, is_active: true, is_available: true, created_at: '', updated_at: '', categories: [], ingredients: [] })
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Nombre producto'), 'Coca Cola')
    await user.clear(screen.getByLabelText('Precio'))
    await user.type(screen.getByLabelText('Precio'), '10.50')
    await user.type(screen.getByLabelText('Stock cantidad'), '5')
    await user.click(screen.getByRole('checkbox', { name: 'Bebidas' }))
    await user.click(screen.getByRole('checkbox', { name: 'Azúcar' }))
    await user.click(screen.getByRole('button', { name: 'Crear producto' }))

    await waitFor(() => expect(productClient.create).toHaveBeenCalled())
    expect(screen.getByRole('combobox', { name: 'Disponibilidad' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Stock' })).toBeInTheDocument()
  })

  it('requires at least one category and one ingredient when creating a product', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Nombre producto'), 'Coca Cola')
    await user.clear(screen.getByLabelText('Precio'))
    await user.type(screen.getByLabelText('Precio'), '10.50')
    await user.type(screen.getByLabelText('Stock cantidad'), '5')
    await user.click(screen.getByRole('button', { name: 'Crear producto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('seleccioná al menos una categoría')
    expect(productClient.create).not.toHaveBeenCalled()

    await user.click(screen.getByRole('checkbox', { name: 'Bebidas' }))
    await user.click(screen.getByRole('button', { name: 'Crear producto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('seleccioná al menos un ingrediente')
    expect(productClient.create).not.toHaveBeenCalled()
  })
})
