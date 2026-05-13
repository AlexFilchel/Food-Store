import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useOperationsOrderListQuery } from '@/features/orders/model/hooks'
import { getProblemDetails } from '@/shared/api/problem-details'

function getStateCellColor(state: string) {
  switch (state) {
    case 'Pendiente':
      return 'bg-amber-100'
    case 'Confirmado':
      return 'bg-sky-100'
    case 'En preparación':
      return 'bg-sky-100'
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

function getPaymentCellColor(status: string | null) {
  switch (status) {
    case 'Aprobado':
      return 'bg-emerald-100'
    case 'Pendiente':
    case 'En proceso':
    case 'Autorizado':
      return 'bg-amber-100'
    case 'Rechazado':
    case 'Cancelado':
    case 'Fallido':
    case 'Contracargo':
      return 'bg-rose-100'
    case 'Reembolsado':
      return 'bg-slate-100'
    default:
      return 'bg-slate-100'
  }
}

export function AdminOrdersPage() {
  const [stateCode, setStateCode] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10
  const skip = (page - 1) * limit

  const filters = useMemo(
    () => ({
      state_code: stateCode || undefined,
      payment_status_code: paymentStatus || undefined,
      customer: customerQuery || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      skip,
      limit,
    }),
    [customerQuery, dateFrom, dateTo, limit, paymentStatus, skip, stateCode],
  )

  const ordersQuery = useOperationsOrderListQuery(filters)
  const orders = ordersQuery.data?.items ?? []
  const total = ordersQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const problem = ordersQuery.error ? getProblemDetails(ordersQuery.error) : null
  const isForbidden = problem?.status === 403

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">OPERACIONES</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Pedidos operativos</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Gestioná todos los pedidos activos y revisá su contexto antes de ejecutar acciones del flujo.
        </p>
      </header>

      <article className="rounded-lg border border-slate-200 p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="ops-state-filter">Estado</label>
            <select
              id="ops-state-filter"
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
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="ops-payment-filter">Pago</label>
            <select
              id="ops-payment-filter"
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(event.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="FAILED">Fallido</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="ops-customer-filter">Cliente</label>
            <input
              id="ops-customer-filter"
              value={customerQuery}
              onChange={(event) => {
                setCustomerQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Nombre o email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="ops-date-from">Desde</label>
            <input
              id="ops-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-700" htmlFor="ops-date-to">Hasta</label>
            <input
              id="ops-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </article>

      {ordersQuery.isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">Cargando pedidos...</p>
        </div>
      ) : null}

      {ordersQuery.isError ? (
        <div className="rounded-lg border border-dashed border-rose-300 bg-rose-50/40 p-8 text-center">
          <p className="text-rose-700">
            {isForbidden ? 'No tenés permisos para acceder a pedidos operativos.' : 'No pudimos cargar los pedidos. Probá de nuevo en un momento.'}
          </p>
        </div>
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900">No hay pedidos para mostrar</h3>
          <p className="text-sm text-slate-600">Probá ajustar los filtros o volvé más tarde.</p>
        </div>
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 ? (
        <article className="rounded-lg border border-slate-200 p-5">
          <div className="h-[430px] overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-[1080px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="border-r border-slate-200/70 px-4 py-3">Pedido</th>
                  <th className="w-64 border-r border-slate-200/70 px-3 py-3">Cliente</th>
                  <th className="w-32 border-r border-slate-200/70 px-2 py-3">Estado</th>
                  <th className="w-32 border-r border-slate-200/70 px-2 py-3">Pago</th>
                  <th className="w-28 border-r border-slate-200/70 px-2 py-3">Subtotal</th>
                  <th className="w-40 border-r border-slate-200/70 px-2 py-3">Creado</th>
                  <th className="w-40 px-2 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-slate-200 align-top">
                    <td className="border-r border-slate-200/60 px-4 py-3">
                      <p className="font-semibold text-slate-950">{order.order_number}</p>
                    </td>
                    <td className="border-r border-slate-200/60 px-3 py-3">
                      <p className="font-medium text-slate-900">{order.customer_name}</p>
                      <p className="text-xs text-slate-500">{order.customer_email}</p>
                    </td>
                    <td className={`border-r border-slate-200/60 px-2 py-3 text-center align-middle font-medium text-slate-950 ${getStateCellColor(order.state)}`}>
                      {order.state}
                    </td>
                    <td className={`border-r border-slate-200/60 px-2 py-3 text-center align-middle font-medium text-slate-950 ${getPaymentCellColor(order.payment_status)}`}>
                      {order.payment_status ?? 'Sin pago'}
                    </td>
                    <td className="border-r border-slate-200/60 px-2 py-3 text-center align-middle font-semibold text-slate-950">
                      ${order.subtotal}
                    </td>
                    <td className="border-r border-slate-200/60 px-2 py-3 text-center align-middle text-xs text-slate-600">
                      {new Date(order.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          to={`${routePaths.adminOrders}/${order.id}`}
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 ? (
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
