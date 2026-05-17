import { useState } from 'react'
import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useOrderListQuery } from '@/features/orders/model/hooks'

function getStateCellColor(state: string) {
  switch (state) {
    case 'Pendiente':
      return 'bg-amber-100'
    case 'Confirmado':
      return 'bg-sky-100'
    case 'En preparación':
      return 'bg-violet-100'
    case 'En camino':
      return 'bg-blue-100'
    case 'Entregado':
      return 'bg-emerald-100'
    case 'Cancelado':
      return 'bg-rose-100'
    default:
      return 'bg-slate-100'
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
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold text-slate-950">Tus pedidos</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Acá vas a ver el historial y estado de todos tus pedidos.
        </p>
      </header>

      <article className="rounded-lg border border-slate-200 p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="state-filter">Estado</label>
            <select
              id="state-filter"
              value={stateCode}
              onChange={(event) => {
                setStateCode(event.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
          <div className="flex items-end">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Total: <span className="font-semibold text-slate-900">{total}</span>
            </div>
          </div>
        </div>
      </article>

      {ordersQuery.isError ? (
        <div className="rounded-lg border border-dashed border-rose-300 bg-rose-50/40 p-8 text-center">
          <p className="text-rose-700">No pudimos cargar tus pedidos. Probá de nuevo en un momento.</p>
        </div>
      ) : null}

      {ordersQuery.isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">Cargando pedidos...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900">Todavía no tenés pedidos</h3>
          <p className="text-sm text-slate-600">Cuando hagas tu primer pedido, va a aparecer acá.</p>
          <div>
            <Link
              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              to={routePaths.home}
            >
              Ir al catálogo
            </Link>
          </div>
        </div>
      ) : (
        <article className="rounded-lg border border-slate-200 p-5">
          <div className="h-[430px] overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-[960px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="border-r border-slate-200/70 px-4 py-3">Pedido</th>
                  <th className="w-32 border-r border-slate-200/70 px-2 py-3">Estado</th>
                  <th className="w-28 border-r border-slate-200/70 px-2 py-3">Items</th>
                  <th className="w-28 border-r border-slate-200/70 px-2 py-3">Subtotal</th>
                  <th className="w-40 border-r border-slate-200/70 px-2 py-3">Acciones</th>
                  <th className="w-40 px-2 py-3">Creado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200 align-top">
                    <td className="border-r border-slate-200/60 px-4 py-3">
                      <p className="font-semibold text-slate-950">{order.order_number}</p>
                    </td>
                    <td className={`border-r border-slate-200/60 px-2 py-3 text-center align-middle font-medium text-slate-950 ${getStateCellColor(order.state)}`}>
                      {order.state}
                    </td>
                    <td className="border-r border-slate-200/60 px-2 py-3 text-center align-middle text-slate-900">
                      {order.item_count}
                    </td>
                    <td className="border-r border-slate-200/60 px-2 py-3 text-center align-middle font-semibold text-slate-950">
                      ${order.subtotal}
                    </td>
                    <td className="border-r border-slate-200/60 px-2 py-3 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          to={`${routePaths.orders}/${order.id}`}
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center align-middle text-xs text-slate-600">
                      {new Date(order.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {orders.length > 0 ? (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
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
