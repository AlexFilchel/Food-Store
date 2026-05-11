import { Link, useParams } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useOrderQuery } from '@/features/orders/model/hooks'

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

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const orderQuery = useOrderQuery(orderId ? Number(orderId) : undefined)
  const order = orderQuery.data

  if (orderQuery.isLoading) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-600">Cargando pedido...</p>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Pedido no encontrado</h2>
        <p className="text-slate-600">No pudimos encontrar el pedido que buscas.</p>
        <Link
          className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          to={routePaths.orders}
        >
          Volver a pedidos
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link className="text-sm text-slate-500 hover:text-slate-700" to={routePaths.orders}>
          &larr; Volver a pedidos
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-950">{order.order_number}</h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStateBadgeColor(order.state)}`}>
            {order.state}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Creado el {new Date(order.created_at).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        {/* items */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Productos</h2>
          {order.items.map((item) => (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Link
                    className="text-lg font-semibold text-slate-950 underline-offset-4 hover:underline"
                    to={`/catalog/products/${item.product_slug || item.product_id}`}
                  >
                    {item.product_name}
                  </Link>
                  {item.removed_ingredients.length > 0 ? (
                    <p className="text-sm text-slate-600">
                      Sin {item.removed_ingredients.join(', sin ')}.
                    </p>
                  ) : null}
                </div>
                <div className="text-sm text-slate-700">
                  <p>{item.quantity} x ${item.unit_price}</p>
                  <p className="font-semibold text-slate-950">${item.line_total}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* sidebar */}
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Resumen</h2>
            {order.payment_method ? (
              <p className="text-sm text-slate-600">Método de pago: {order.payment_method}</p>
            ) : null}
          </div>

          <dl className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <dt>Items</dt>
              <dd>{order.items.length}</dd>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-slate-950">
              <dt>Total</dt>
              <dd>${order.subtotal}</dd>
            </div>
          </dl>

          {order.notes ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Notas</p>
              <p>{order.notes}</p>
            </div>
          ) : null}

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Dirección de entrega</p>
            <p>{order.delivery_address.recipient_name}</p>
            <p>{order.delivery_address.street} {order.delivery_address.street_number}
              {order.delivery_address.floor ? `, Piso ${order.delivery_address.floor}` : ''}
              {order.delivery_address.apartment ? `, Depto ${order.delivery_address.apartment}` : ''}
            </p>
            <p>{order.delivery_address.city}, {order.delivery_address.province} ({order.delivery_address.postal_code})</p>
            <p>Tel: {order.delivery_address.phone}</p>
            {order.delivery_address.reference ? (
              <p className="mt-1 text-xs text-slate-500">Ref: {order.delivery_address.reference}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  )
}
