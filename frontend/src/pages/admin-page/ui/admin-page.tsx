import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'

export function AdminPage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">ADMIN</span>
      <h2 className="mt-4 text-3xl font-semibold text-slate-950">Panel de administración</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Este espacio queda reservado para orquestación general, métricas operativas y módulos administrativos. La primera capacidad operativa ya vive en categorías.
      </p>
      <div className="mt-6">
        <Link className="inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" to={routePaths.adminCategories}>
          Ir a gestión de categorías
        </Link>
        <Link className="ml-3 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" to={routePaths.adminIngredients}>
          Ir a gestión de ingredientes
        </Link>
      </div>
    </section>
  )
}
