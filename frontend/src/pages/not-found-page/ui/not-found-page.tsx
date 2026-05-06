import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">404</span>
      <h1 className="mt-4 text-4xl font-semibold text-slate-950">No encontramos esa ruta</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Revisá la URL o volvé al inicio. Si querías una sección protegida, entrá primero con tu usuario.
      </p>
      <Link className="mt-6 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" to={routePaths.home}>
        Ir al inicio
      </Link>
    </section>
  )
}
