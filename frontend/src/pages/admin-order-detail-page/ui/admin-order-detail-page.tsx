import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useOperationsOrderQuery, useOperationsOrderTransitionMutation } from '@/features/orders/model/hooks'
import { getProblemDetails } from '@/shared/api/problem-details'

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

function getPaymentBadgeColor(status: string | null) {
  switch (status) {
    case 'Aprobado':
      return 'bg-emerald-100 text-emerald-900'
    case 'Pendiente':
    case 'En proceso':
    case 'Autorizado':
      return 'bg-amber-100 text-amber-900'
    case 'Rechazado':
    case 'Cancelado':
    case 'Fallido':
    case 'Contracargo':
      return 'bg-rose-100 text-rose-900'
    case 'Reembolsado':
      return 'bg-slate-100 text-slate-900'
    default:
      return 'bg-slate-100 text-slate-900'
  }
}

const ACTION_LABELS: Record<string, string> = {
  CONFIRMADO: 'Confirmar pedido',
  EN_PREPARACION: 'Pasar a preparación',
  EN_CAMINO: 'Despachar envío',
  ENTREGADO: 'Marcar entregado',
  CANCELADO: 'Cancelar pedido',
}

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const orderIdNum = orderId ? Number(orderId) : undefined
  const orderQuery = useOperationsOrderQuery(orderIdNum)
  const order = orderQuery.data
  const [actionError, setActionError] = useState<string | null>(null)

  const transitionMutation = useOperationsOrderTransitionMutation(orderIdNum ?? 0)

  const handleAction = async (action: string) => {
    if (!orderIdNum) return
    setActionError(null)
    try {
      await transitionMutation.mutateAsync({ to_state_code: action })
    } catch (error) {
      const problem = getProblemDetails(error)
      setActionError(problem?.detail ?? 'No pudimos aplicar la acción seleccionada.')
    }
  }

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
        <p className="text-slate-600">No pudimos cargar el pedido solicitado.</p>
        <Link
          className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          to={routePaths.adminOrders}
        >
          Volver a pedidos
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link className="text-sm text-slate-500 hover:text-slate-700" to={routePaths.adminOrders}>
          &larr; Volver a pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-950">{order.order.order_number}</h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStateBadgeColor(order.order.state)}`}>
            {order.order.state}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          {order.customer.full_name} &middot; {order.customer.email}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Productos</h2>
          {order.items.map((item) => (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">{item.product_name}</p>
                  {item.removed_ingredients.length > 0 ? (
                    <p className="text-sm text-slate-600">Sin {item.removed_ingredients.join(', sin ')}.</p>
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

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Resumen</h2>
            {order.order.payment_method ? (
              <p className="text-sm text-slate-600">Método de pago: {order.order.payment_method}</p>
            ) : null}
          </div>

          <dl className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <dt>Items</dt>
              <dd>{order.items.length}</dd>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-slate-950">
              <dt>Total</dt>
              <dd>${order.order.subtotal}</dd>
            </div>
          </dl>

          {order.payment ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Pago</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getPaymentBadgeColor(order.payment.status)}`}>
                  {order.payment.status}
                </span>
                <span className="text-xs text-slate-500">${order.payment.amount}</span>
              </div>
              {order.payment.failure_reason ? (
                <p className="mt-1 text-xs text-rose-600">{order.payment.failure_reason}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                Estado local: {order.payment.status_code}
                {order.payment.provider_reference ? ` · Ref: ${order.payment.provider_reference}` : ''}
              </p>
              {order.payment.last_synced_at ? (
                <p className="text-xs text-slate-500">Última sync: {new Date(order.payment.last_synced_at).toLocaleString('es-AR')}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Sin información de pago.</div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Dirección de entrega</p>
            <p>{order.delivery_address.recipient_name}</p>
            <p>{order.delivery_address.street} {order.delivery_address.street_number}</p>
            <p>
              {order.delivery_address.city}, {order.delivery_address.province} ({order.delivery_address.postal_code})
            </p>
            <p>Tel: {order.delivery_address.phone}</p>
            {order.delivery_address.reference ? (
              <p className="mt-1 text-xs text-slate-500">Ref: {order.delivery_address.reference}</p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Acciones disponibles</p>
            {order.allowed_actions.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No hay acciones disponibles.</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {order.allowed_actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    onClick={() => handleAction(action)}
                    disabled={transitionMutation.isPending}
                  >
                    {ACTION_LABELS[action] ?? action}
                  </button>
                ))}
              </div>
            )}
            {actionError ? <p className="mt-2 text-xs text-rose-600">{actionError}</p> : null}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Historial</p>
            {order.history.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Todavía no hay eventos.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {order.history.map((entry) => (
                  <li key={entry.id} className="rounded-lg bg-white px-3 py-2">
                    <p className="text-xs font-medium text-slate-900">{entry.to_state}</p>
                    <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString('es-AR')}</p>
                    {entry.note ? <p className="text-xs text-slate-600">{entry.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
