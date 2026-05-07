import { useMemo, useState } from 'react'

import { useCategoriesListQuery } from '@/features/categories/model/use-categories-list-query'
import { useIngredientsListQuery } from '@/features/ingredients/model/hooks'
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsListQuery,
  useUpdateProductMutation,
} from '@/features/products/model/hooks'
import type { Product } from '@/entities/products/model/types'
import { getErrorMessage } from '@/shared/api/problem-details'

export function ProductManagementPage() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [ingredientIds, setIngredientIds] = useState<number[]>([])
  const [availability, setAvailability] = useState<string>('')
  const [stockState, setStockState] = useState<string>('')
  const [form, setForm] = useState({ name: '', description: '', price: '0.00', stock_quantity: 0, is_active: true, is_available: true })

  const products = useProductsListQuery({ page: 1, size: 50, search, category_id: categoryIds[0], ingredient_id: ingredientIds[0], availability: availability === '' ? undefined : availability === 'true', stock_state: stockState === '' ? undefined : stockState as 'in_stock' | 'out_of_stock' })
  const categories = useCategoriesListQuery({ page: 1, size: 100, include_inactive: false })
  const ingredients = useIngredientsListQuery({ page: 1, size: 100, include_inactive: false, search: '' })
  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const deleteMutation = useDeleteProductMutation()

  const isPending = createMutation.isPending || updateMutation.isPending

  const composition = useMemo(() => ingredientIds.map((id) => ({ ingredient_id: id, is_removable: true })), [ingredientIds])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const payload = { ...form, category_ids: categoryIds, ingredients: composition }
    try {
      if (editing) await updateMutation.mutateAsync({ productId: editing.id, payload })
      else await createMutation.mutateAsync(payload)
      setEditing(null)
      setForm({ name: '', description: '', price: '0.00', stock_quantity: 0, is_active: true, is_available: true })
      setCategoryIds([])
      setIngredientIds([])
    } catch (cause) {
      setError(getErrorMessage(cause, 'No pudimos guardar el producto.'))
    }
  }

  return <section>
    <h2>Gestión de productos</h2>
    <label>Buscar<input aria-label='Buscar productos' value={search} onChange={(e) => setSearch(e.target.value)} /></label>
    <label>Disponibilidad<select aria-label='Disponibilidad' value={availability} onChange={(e) => setAvailability(e.target.value)}><option value=''>Todas</option><option value='true'>Disponible</option><option value='false'>No disponible</option></select></label>
    <label>Stock<select aria-label='Stock' value={stockState} onChange={(e) => setStockState(e.target.value)}><option value=''>Todos</option><option value='in_stock'>Con stock</option><option value='out_of_stock'>Sin stock</option></select></label>
    {error ? <p role='alert'>{error}</p> : null}
    <form onSubmit={onSubmit} aria-label='Formulario de producto'>
      <label>Nombre<input aria-label='Nombre producto' value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></label>
      <label>Descripción<input aria-label='Descripción producto' value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></label>
      <label>Precio<input aria-label='Precio' value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} /></label>
      <label>Stock<input aria-label='Stock cantidad' type='number' value={form.stock_quantity} onChange={(e) => setForm((s) => ({ ...s, stock_quantity: Number(e.target.value) }))} /></label>
      <label><input type='checkbox' checked={form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} /> Activo</label>
      <label><input type='checkbox' checked={form.is_available} onChange={(e) => setForm((s) => ({ ...s, is_available: e.target.checked }))} /> Disponible</label>
      <label>Categorías<select aria-label='Categorías' multiple value={categoryIds.map(String)} onChange={(e) => setCategoryIds(Array.from(e.currentTarget.selectedOptions, (o) => Number(o.value)))}>{(categories.data?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Ingredientes<select aria-label='Ingredientes' multiple value={ingredientIds.map(String)} onChange={(e) => setIngredientIds(Array.from(e.currentTarget.selectedOptions, (o) => Number(o.value)))}>{(ingredients.data?.items ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
      <button type='submit' disabled={isPending}>{editing ? 'Guardar cambios' : 'Crear producto'}</button>
    </form>
    {products.isLoading ? <p>Cargando productos...</p> : null}
    {(products.data?.items ?? []).map((product) => <article key={product.id}><h3>{product.name}</h3><p>{product.price}</p><p>{product.is_available ? 'Disponible' : 'No disponible'} · {product.stock_quantity > 0 ? 'Con stock' : 'Sin stock'}</p><button type='button' onClick={() => { setEditing(product); setForm({ name: product.name, description: product.description ?? '', price: product.price, stock_quantity: product.stock_quantity, is_active: product.is_active, is_available: product.is_available }); setCategoryIds(product.categories.map((c) => c.id)); setIngredientIds(product.ingredients.map((i) => i.ingredient_id)); }}>Editar</button><button type='button' onClick={async () => { if (!window.confirm(`¿Eliminar producto ${product.name}?`)) return; try { await deleteMutation.mutateAsync(product.id) } catch (cause) { setError(getErrorMessage(cause, 'No pudimos eliminar el producto.')) } }}>Eliminar</button></article>)}
  </section>
}
