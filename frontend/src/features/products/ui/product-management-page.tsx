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

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">ADMIN · Productos</span>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">Gestión de productos</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Administrá el catálogo de productos con precios, stock, categorías e ingredientes.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Buscar</label>
          <input
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            placeholder="Nombre del producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Disponibilidad</label>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="true">Disponible</option>
            <option value="false">No disponible</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Stock</label>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            value={stockState}
            onChange={(e) => setStockState(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="in_stock">Con stock</option>
            <option value="out_of_stock">Sin stock</option>
          </select>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(380px,480px)]">
        {/* Product List */}
        <article className="rounded-3xl border border-slate-200 p-5">
          <h3 className="text-xl font-semibold text-slate-950">Lista de productos</h3>
          <p className="mt-2 text-sm text-slate-600">Productos activos del catálogo.</p>

          {products.isLoading ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Cargando productos...</p>
          ) : null}

          {!products.isLoading && (products.data?.items ?? []).length === 0 ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No hay productos cargados.</p>
          ) : null}

          <ul className="mt-5 space-y-3">
            {(products.data?.items ?? []).map((product) => (
              <li className="rounded-2xl border border-slate-200 p-4" key={product.id}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-950">{product.name}</h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {product.is_available ? 'Disponible' : 'No disponible'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.stock_quantity > 0 ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {product.stock_quantity > 0 ? `Stock: ${product.stock_quantity}` : 'Sin stock'}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">${product.price}</p>
                    <p className="text-sm text-slate-600">{product.description || 'Sin descripción.'}</p>
                    {product.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {product.categories.map((c) => (
                          <span key={c.id} className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      type="button"
                      onClick={() => {
                        setEditing(product)
                        setForm({ name: product.name, description: product.description ?? '', price: product.price, stock_quantity: product.stock_quantity, is_active: product.is_active, is_available: product.is_available })
                        setCategoryIds(product.categories.map((c) => c.id))
                        setIngredientIds(product.ingredients.map((i) => i.ingredient_id))
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
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
                </div>
              </li>
            ))}
          </ul>
        </article>

        {/* Product Form */}
        <article className="rounded-3xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">{editing ? 'Editar producto' : 'Crear producto'}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Completá los datos del producto. Los campos marcados son obligatorios.
              </p>
            </div>

            {editing ? (
              <button
                className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => {
                  setEditing(null)
                  setForm({ name: '', description: '', price: '0.00', stock_quantity: 0, is_active: true, is_available: true })
                  setCategoryIds([])
                  setIngredientIds([])
                }}
                type="button"
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <form className="mt-5 space-y-4" onSubmit={onSubmit} aria-label="Formulario de producto">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-name">
                Nombre
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-description">
                Descripción
              </label>
              <textarea
                className="min-h-20 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="product-description"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="product-price">
                  Precio
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="product-stock">
                  Stock
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  id="product-stock"
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(e) => setForm((s) => ({ ...s, stock_quantity: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  checked={form.is_active}
                  className="size-4 rounded border-slate-300"
                  onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
                  type="checkbox"
                />
                Activo
              </label>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  checked={form.is_available}
                  className="size-4 rounded border-slate-300"
                  onChange={(e) => setForm((s) => ({ ...s, is_available: e.target.checked }))}
                  type="checkbox"
                />
                Disponible
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-categories">
                Categorías
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="product-categories"
                multiple
                value={categoryIds.map(String)}
                onChange={(e) => setCategoryIds(Array.from(e.currentTarget.selectedOptions, (o) => Number(o.value)))}
              >
                {(categories.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Mantené Ctrl/Cmd para seleccionar múltiples.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="product-ingredients">
                Ingredientes
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                id="product-ingredients"
                multiple
                value={ingredientIds.map(String)}
                onChange={(e) => setIngredientIds(Array.from(e.currentTarget.selectedOptions, (o) => Number(o.value)))}
              >
                {(ingredients.data?.items ?? []).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Mantené Ctrl/Cmd para seleccionar múltiples.</p>
            </div>

            <button
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </form>
        </article>
      </div>
    </section>
  )
}
