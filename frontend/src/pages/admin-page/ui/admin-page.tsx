import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'

export function AdminPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-3xl font-semibold text-slate-950">Panel de administración</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Este espacio queda reservado para orquestación general, métricas operativas y módulos administrativos. La primera capacidad operativa ya vive en categorías.
      </p>
      <div className="mt-6">
        <Link className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" to={routePaths.adminMetrics}>
          Ir a dashboard de métricas
        </Link>
        <Link className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" to={routePaths.adminCategories}>
          Ir a gestión de categorías
        </Link>
        <Link className="ml-3 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" to={routePaths.adminIngredients}>
          Ir a gestión de ingredientes
        </Link>
      </div>
    </section>
  )
}
