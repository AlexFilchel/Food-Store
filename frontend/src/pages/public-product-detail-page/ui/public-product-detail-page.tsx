import { Link, useParams } from 'react-router-dom'

import { usePublicCatalogDetailQuery } from '@/features/public-catalog/model/hooks'
import { routePaths } from '@/app/routes/route-config'
import { isProblemStatus } from '@/shared/api/problem-details'

export function PublicProductDetailPage() {
  const { productIdOrSlug = '' } = useParams<{ productIdOrSlug: string }>()
  const query = usePublicCatalogDetailQuery(productIdOrSlug)

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
    </section>
  )
}
