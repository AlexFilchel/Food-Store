import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'

export function AccessDeniedPage() {
  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
        Acceso denegado
      </span>
      <h2 className="mt-4 text-3xl font-semibold text-slate-950">No tenés permisos para esta sección</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        El shell te protege a nivel de experiencia, pero la autorización real sigue estando del lado del backend. Si creés que esto es un error, hablá con un administrador.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" to={routePaths.app}>
          Ir a mi espacio
        </Link>
        <Link className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" to={routePaths.home}>
          Volver al inicio
        </Link>
      </div>
    </section>
  )
}
