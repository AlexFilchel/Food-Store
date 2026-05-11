import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { usePublicCatalogDetailQuery } from '@/features/public-catalog/model/hooks'
import { routePaths } from '@/app/routes/route-config'
import { isProblemStatus } from '@/shared/api/problem-details'
import { useCartStore } from '@/shared/stores/cart-store'

export function PublicProductDetailPage() {
  const { productIdOrSlug = '' } = useParams<{ productIdOrSlug: string }>()
  const query = usePublicCatalogDetailQuery(productIdOrSlug)
  const addItem = useCartStore((state) => state.addItem)
  const [quantityInput, setQuantityInput] = useState('1')
  const [removedIngredientIds, setRemovedIngredientIds] = useState<number[]>([])
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  if (query.isLoading) {
    return <section className="mx-auto max-w-5xl px-4 py-10"><p>Cargando detalle del producto...</p></section>
  }

  if (query.isError && isProblemStatus(query.error, 404)) {
    return (
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-950">Producto no encontrado</h1>
        <p className="text-slate-600">Este producto no está disponible en el catálogo público.</p>
        <Link className="text-sky-700 underline" to={routePaths.home}>Volver al catálogo</Link>
      </section>
    )
  }

  if (query.isError) {
    return (
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-950">No pudimos cargar el producto</h1>
        <p className="text-slate-600">Probá nuevamente en unos instantes.</p>
      </section>
    )
  }

  if (!query.data) {
    return null
  }

  const product = query.data
  const removableIngredients = product.ingredients.filter((ingredient) => ingredient.is_removable)
  const removedIngredientSet = new Set(removedIngredientIds)

  const updateQuantityInput = (nextValue: string) => {
    setFeedback(null)
    setQuantityInput(nextValue.replace(/[^0-9]/g, ''))
  }

  const updateQuantity = (nextQuantity: number) => {
    setFeedback(null)
    setQuantityInput(String(Math.max(1, nextQuantity)))
  }

  const toggleRemovedIngredient = (ingredientId: number, isRemovable: boolean) => {
    if (!isRemovable) {
      return
    }

    setFeedback(null)
    setRemovedIngredientIds((current) =>
      current.includes(ingredientId)
        ? current.filter((value) => value !== ingredientId)
        : [...current, ingredientId],
    )
  }

  const handleAddToCart = () => {
    const quantity = Number.parseInt(quantityInput, 10)

    if (!Number.isInteger(quantity) || quantity < 1) {
      setFeedback({ type: 'error', message: 'Elegí una cantidad válida antes de agregar el producto.' })
      return
    }

    try {
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        unitPrice: product.price,
        quantity,
        removedIngredients: removableIngredients
          .filter((ingredient) => removedIngredientSet.has(ingredient.ingredient_id))
          .map((ingredient) => ({
            id: ingredient.ingredient_id,
            name: ingredient.name,
          })),
      })

      setFeedback({ type: 'success', message: 'Producto agregado al carrito.' })
    } catch {
      setFeedback({ type: 'error', message: 'No pudimos agregar este producto al carrito. Probá nuevamente.' })
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link className="text-sm text-sky-700 underline" to={routePaths.home}>← Volver al catálogo</Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">{product.name}</h1>
        <p className="text-xl font-semibold text-slate-900">${product.price}</p>
        <p className="text-slate-700">{product.description || 'Sin descripción.'}</p>
      </header>

      <div className="space-y-2">
        <h2 className="text-lg font-medium text-slate-900">Categorías</h2>
        {product.categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {product.categories.map((category) => (
              <span key={category.id} className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-900">
                {category.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-slate-600">Sin categorías asignadas.</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium text-slate-900">Ingredientes</h2>
        {product.ingredients.length > 0 ? (
          <ul className="space-y-2">
            {product.ingredients.map((ingredient) => (
              <li key={ingredient.ingredient_id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                {ingredient.name} · {ingredient.is_removable ? 'Removible' : 'No removible'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-600">Sin ingredientes informados.</p>
        )}
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-slate-900">Personalizá tu producto</h2>
          <p className="text-sm text-slate-600">Podés quitar ingredientes removibles y elegir cuántas unidades querés sumar al carrito.</p>
        </div>

        <div className="space-y-3">
          {product.ingredients.length > 0 ? (
            <ul className="space-y-3">
              {product.ingredients.map((ingredient) => {
                const isChecked = removedIngredientSet.has(ingredient.ingredient_id)

                return (
                  <li key={ingredient.ingredient_id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <label className={`flex items-start gap-3 ${ingredient.is_removable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                      <input
                        aria-label={`Quitar ${ingredient.name}`}
                        checked={isChecked}
                        disabled={!ingredient.is_removable}
                        onChange={() => toggleRemovedIngredient(ingredient.ingredient_id, ingredient.is_removable)}
                        type="checkbox"
                      />
                      <span>
                        <span className="block font-medium text-slate-900">{ingredient.name}</span>
                        <span className="block text-sm text-slate-600">
                          {ingredient.is_removable ? 'Se puede quitar de esta preparación.' : 'Este ingrediente no se puede quitar.'}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">Este producto no informa ingredientes para personalizar.</p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-900" htmlFor="product-quantity">Cantidad</label>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => updateQuantity(Number.parseInt(quantityInput || '1', 10) - 1)}
              type="button"
            >
              −
            </button>
            <input
              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-center"
              id="product-quantity"
              inputMode="numeric"
              min={1}
              onChange={(event) => updateQuantityInput(event.target.value)}
              value={quantityInput}
            />
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => updateQuantity(Number.parseInt(quantityInput || '0', 10) + 1)}
              type="button"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="inline-flex justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-medium text-white hover:bg-sky-700"
            onClick={handleAddToCart}
            type="button"
          >
            Agregar al carrito
          </button>
          <Link className="inline-flex justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50" to={routePaths.cart}>
            Revisar carrito
          </Link>
        </div>

        {feedback ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : 'border border-amber-200 bg-amber-50 text-amber-900'}`} role={feedback.type === 'success' ? 'status' : 'alert'}>
            {feedback.message}
          </div>
        ) : null}
      </div>
    </section>
  )
}
