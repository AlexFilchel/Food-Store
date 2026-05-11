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
  const ordersQuery = useOrderListQuery()
  const orders = ordersQuery.data ?? []

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-900">PEDIDOS</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Tus pedidos</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Acá vas a ver el historial y estado de todos tus pedidos.
        </p>
      </header>

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
    </section>
  )
}
