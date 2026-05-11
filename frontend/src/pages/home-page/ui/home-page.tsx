import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { usePublicCatalogListQuery } from '@/features/public-catalog/model/hooks'

export function HomePage() {
  const [search, setSearch] = useState('')
  const [categoryIdInput, setCategoryIdInput] = useState('')

  const filters = useMemo(
    () => ({
      page: 1,
      size: 12,
      search: search.trim() || undefined,
      category_id: categoryIdInput.trim() ? Number(categoryIdInput) : undefined,
    }),
    [search, categoryIdInput],
  )

  const query = usePublicCatalogListQuery(filters)

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">Catálogo público</h1>
        <p className="text-slate-600">Descubrí productos disponibles para comprar.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          aria-label="Buscar productos"
          className="rounded-xl border border-slate-300 px-3 py-2"
          placeholder="Buscar por nombre"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <input
          aria-label="Filtrar por categoría"
          className="rounded-xl border border-slate-300 px-3 py-2"
          inputMode="numeric"
          min={1}
          placeholder="Filtrar por category_id"
          value={categoryIdInput}
          onChange={(event) => setCategoryIdInput(event.target.value.replace(/[^0-9]/g, ''))}
        />
      </div>

      {query.isLoading ? <p>Cargando catálogo...</p> : null}
      {query.isError ? <p role="alert">No pudimos cargar el catálogo público.</p> : null}
      {!query.isLoading && !query.isError && (query.data?.items.length ?? 0) === 0 ? (
        <p>No encontramos productos disponibles con esos filtros.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(query.data?.items ?? []).map((product) => (
          <article key={product.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-950">{product.name}</h2>
            <p className="text-sm text-slate-600">{product.description || 'Sin descripción.'}</p>
            <p className="font-semibold text-slate-900">${product.price}</p>

            <div className="flex flex-wrap gap-2">
              {product.categories.map((category) => (
                <span key={category.id} className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-900">
                  {category.name}
                </span>
              ))}
            </div>

            <Link
              className="inline-flex rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
              to={routePaths.catalogProductDetail.replace(':productIdOrSlug', product.slug)}
            >
              Ver detalle y agregar
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
