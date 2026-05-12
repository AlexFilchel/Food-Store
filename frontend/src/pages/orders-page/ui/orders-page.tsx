import { useState } from 'react'
import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useOrderListQuery } from '@/features/orders/model/hooks'

function getStateBadgeColor(state: string) {
  switch (state) {
    case 'Pendiente':
      return 'bg-amber-100 text-amber-900'
    case 'Confirmado':
      return 'bg-sky-100 text-sky-900'
    case 'En preparación':
      return 'bg-violet-100 text-violet-900'
    case 'En camino':
      return 'bg-blue-100 text-blue-900'
    case 'Entregado':
      return 'bg-emerald-100 text-emerald-900'
    case 'Cancelado':
      return 'bg-rose-100 text-rose-900'
    default:
      return 'bg-slate-100 text-slate-900'
  }
}

export function OrdersPage() {
  const [stateCode, setStateCode] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 10
  const skip = (page - 1) * limit

  const ordersQuery = useOrderListQuery({ state_code: stateCode || undefined, skip, limit })
  const orders = ordersQuery.data?.items ?? []
  const total = ordersQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-900">PEDIDOS</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Tus pedidos</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Acá vas a ver el historial y estado de todos tus pedidos.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-700" htmlFor="state-filter">Estado</label>
          <select
            id="state-filter"
            value={stateCode}
            onChange={(event) => {
              setStateCode(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="EN_PREPARACION">En preparación</option>
            <option value="EN_CAMINO">En camino</option>
            <option value="ENTREGADO">Entregado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </header>

      {ordersQuery.isError ? (
        <div className="rounded-3xl border border-dashed border-rose-300 bg-white p-8 text-center">
          <p className="text-rose-700">No pudimos cargar tus pedidos. Probá de nuevo en un momento.</p>
        </div>
      ) : null}

      {ordersQuery.isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Cargando pedidos...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Todavía no tenés pedidos</h2>
          <p className="text-slate-600">Cuando hagas tu primer pedido, va a aparecer acá.</p>
          <div>
            <Link
              className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              to={routePaths.home}
            >
              Ir al catálogo
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">{order.order_number}</p>
                  <p className="text-sm text-slate-600">
                    {order.item_count} producto(s) &middot; {new Date(order.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStateBadgeColor(order.state)}`}>
                    {order.state}
                  </span>
                  <p className="text-lg font-semibold text-slate-950">${order.subtotal}</p>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  to={`${routePaths.orders}/${order.id}`}
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {orders.length > 0 ? (
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p>
            Mostrando {skip + 1} - {Math.min(skip + limit, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <span>Página {page} / {totalPages}</span>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
