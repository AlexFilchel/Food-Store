import { useMemo, useState } from 'react'

import type { Product } from '@/entities/products/model/types'
import { useCategoriesListQuery } from '@/features/categories/model/use-categories-list-query'
import { useIngredientsListQuery } from '@/features/ingredients/model/hooks'
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsListQuery,
  useUpdateProductMutation,
} from '@/features/products/model/hooks'
import { getErrorMessage } from '@/shared/api/problem-details'

export function ProductManagementPage() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [ingredientIds, setIngredientIds] = useState<number[]>([])
  const [availability, setAvailability] = useState<string>('')
  const [stockState, setStockState] = useState<string>('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>(undefined)
  const [form, setForm] = useState({ name: '', description: '', price: '0.00', stock_quantity: 0, is_active: true, is_available: true })

  const products = useProductsListQuery({
    page: 1,
    size: 50,
    search,
    category_id: filterCategoryId,
    ingredient_id: ingredientIds[0],
    availability: availability === '' ? undefined : availability === 'true',
    stock_state: stockState === '' ? undefined : (stockState as 'in_stock' | 'out_of_stock'),
    include_inactive: includeInactive,
  })
  const categories = useCategoriesListQuery({ page: 1, size: 100, include_inactive: false })
  const ingredients = useIngredientsListQuery({ page: 1, size: 100, include_inactive: false, search: '' })
  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const deleteMutation = useDeleteProductMutation()

  const isPending = createMutation.isPending || updateMutation.isPending
  const composition = useMemo(() => ingredientIds.map((id) => ({ ingredient_id: id, is_removable: true })), [ingredientIds])

  function scrollToPageTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleCategory(categoryId: number) {
    setCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    )
  }

  function toggleIngredient(ingredientId: number) {
    setIngredientIds((current) =>
      current.includes(ingredientId) ? current.filter((id) => id !== ingredientId) : [...current, ingredientId],
    )
  }

  function resetForm() {
    setEditing(null)
    setForm({ name: '', description: '', price: '0.00', stock_quantity: 0, is_active: true, is_available: true })
    setCategoryIds([])
    setIngredientIds([])
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const payload = { ...form, category_ids: categoryIds, ingredients: composition }

    try {
      if (editing) await updateMutation.mutateAsync({ productId: editing.id, payload })
      else await createMutation.mutateAsync(payload)
      resetForm()
    } catch (cause) {
      setError(getErrorMessage(cause, 'No pudimos guardar el producto.'))
    }
  }

  const productItems = products.data?.items ?? []

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-3xl font-semibold text-slate-950">Gestión de productos</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Administrá el catálogo de productos con precios, stock, categorías e ingredientes.</p>
      </div>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p> : null}

      <article className="rounded-lg border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{editing ? 'Editar producto' : 'Crear producto'}</h3>
            <p className="mt-2 text-sm text-slate-600">Completá los datos del producto.</p>
          </div>

          {editing ? (
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={resetForm} type="button">Cancelar</button>
          ) : null}
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit} aria-label="Formulario de producto">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-name">Nombre producto</label>
              <input className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200" id="product-name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-description">Descripción</label>
              <textarea className="min-h-20 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200" id="product-description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-price">Precio</label>
              <input className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200" id="product-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-stock">Stock cantidad</label>
              <input className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200" id="product-stock" type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm((s) => ({ ...s, stock_quantity: Number(e.target.value) }))} />
              <p className="text-xs text-slate-500">El stock no puede ser negativo (mín. 0).</p>
            </div>

            <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
              <input checked={form.is_active} className="size-4 rounded border-slate-300" onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} type="checkbox" />
              Activo
            </label>
            <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
              <input checked={form.is_available} className="size-4 rounded border-slate-300" onChange={(e) => setForm((s) => ({ ...s, is_available: e.target.checked }))} type="checkbox" />
              Disponible
            </label>

            <div className="space-y-2 md:col-span-2">
              <p className="block text-sm font-medium text-slate-700">Categorías</p>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
                {(categories.data?.items ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No hay categorías activas disponibles.</p>
                ) : (
                  (categories.data?.items ?? []).map((category) => (
                    <label
                      key={category.id}
                      className={`inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-sm text-slate-700 transition ${
                        categoryIds.includes(category.id)
                          ? 'border-sky-300 bg-sky-50 text-sky-900'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="size-4 rounded border-slate-300"
                      />
                      <span className="min-w-0 truncate" title={category.name}>{category.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <p className="block text-sm font-medium text-slate-700">Ingredientes</p>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
                {(ingredients.data?.items ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No hay ingredientes activos disponibles.</p>
                ) : (
                  (ingredients.data?.items ?? []).map((ingredient) => (
                    <label
                      key={ingredient.id}
                      className={`inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-sm text-slate-700 transition ${
                        ingredientIds.includes(ingredient.id)
                          ? 'border-sky-300 bg-sky-50 text-sky-900'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ingredientIds.includes(ingredient.id)}
                        onChange={() => toggleIngredient(ingredient.id)}
                        className="size-4 rounded border-slate-300"
                      />
                      <span className="min-w-0 truncate" title={ingredient.name}>{ingredient.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <button className="inline-flex w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending} type="submit">
            {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </form>
      </article>

      <article className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-xl font-semibold text-slate-950">Productos (administración)</h3>

        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700" htmlFor="product-search">Buscar</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              id="product-search"
              placeholder="Nombre del producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700" htmlFor="filter-category">Categoría</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="filter-category"
                value={filterCategoryId ?? ''}
                onChange={(e) => setFilterCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Todas</option>
                {(categories.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700" htmlFor="filter-availability">Disponibilidad</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="filter-availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="true">Disponible</option>
                <option value="false">No disponible</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700" htmlFor="filter-stock">Stock</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="filter-stock"
                value={stockState}
                onChange={(e) => setStockState(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="in_stock">Con stock</option>
                <option value="out_of_stock">Sin stock</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="inline-flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 xl:w-auto">
                <input
                  checked={includeInactive}
                  className="size-4 rounded border-slate-300"
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  type="checkbox"
                />
                Incluir inactivos
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 h-[430px] overflow-auto rounded-lg border border-slate-200">
          {products.isLoading ? <p className="m-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Cargando productos...</p> : null}
          {!products.isLoading && productItems.length === 0 ? <p className="m-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No hay productos cargados.</p> : null}

          {!products.isLoading && productItems.length > 0 ? (
            <table className="min-w-[1080px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-200/70">Nombre</th>
                  <th className="px-4 py-3 border-r border-slate-200/70">Precio</th>
                  <th className="px-4 py-3 border-r border-slate-200/70">Stock</th>
                  <th className="px-4 py-3 border-r border-slate-200/70">Disponibilidad</th>
                  <th className="px-4 py-3 border-r border-slate-200/70">Estado</th>
                  <th className="px-4 py-3 border-r border-slate-200/70">Categorías</th>
                  <th className="px-4 py-3 border-r border-slate-200/70">Ingredientes</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productItems.map((product) => (
                  <tr className="border-t border-slate-200 align-top" key={product.id}>
                    <td className="px-4 py-3 border-r border-slate-200/60">
                      <p className="font-semibold text-slate-950">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.description || 'Sin descripción.'}</p>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200/60 align-middle text-center font-semibold text-slate-900">${product.price}</td>
                    <td className="px-4 py-3 border-r border-slate-200/60 align-middle text-center text-slate-900">{product.stock_quantity}</td>
                    <td
                      className={`px-4 py-3 border-r border-slate-200/60 align-middle text-center font-medium text-slate-950 ${
                        product.is_available ? 'bg-emerald-100/80' : 'bg-rose-200/80'
                      }`}
                    >
                      {product.is_available ? 'Disponible' : 'No Disponible'}
                    </td>
                    <td
                      className={`px-4 py-3 border-r border-slate-200/60 align-middle text-center font-medium text-slate-950 ${
                        product.is_active ? 'bg-emerald-100/80' : 'bg-rose-200/80'
                      }`}
                    >
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200/60 align-middle text-center">
                      {product.categories.length > 0 ? (
                        <p className="text-sm text-slate-950">{product.categories.map((category) => category.name).join(' - ')}</p>
                      ) : (
                        <span className="text-xs text-slate-500">Sin categorías</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200/60 align-middle text-center">
                      {product.ingredients.length > 0 ? (
                        <p className="text-sm text-slate-950">{product.ingredients.map((ingredient) => ingredient.name).join(' - ')}</p>
                      ) : (
                        <span className="text-xs text-slate-500">Sin ingredientes</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          type="button"
                          onClick={() => {
                            setEditing(product)
                            setForm({ name: product.name, description: product.description ?? '', price: product.price, stock_quantity: product.stock_quantity, is_active: product.is_active, is_available: product.is_available })
                            setCategoryIds(product.categories.map((c) => c.id))
                            setIngredientIds(product.ingredients.map((i) => i.ingredient_id))
                            scrollToPageTop()
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`¿Eliminar producto ${product.name}?`)) return
                            try {
                              await deleteMutation.mutateAsync(product.id)
                            } catch (cause) {
                              setError(getErrorMessage(cause, 'No pudimos eliminar el producto.'))
                            }
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </article>
    </section>
  )
}
