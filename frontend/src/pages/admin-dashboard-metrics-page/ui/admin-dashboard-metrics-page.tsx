import { useMemo, useState } from 'react'

import { useAdminDashboardMetricsQuery } from '@/features/admin-dashboard-metrics/model/hooks'
import { getProblemDetails } from '@/shared/api/problem-details'

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'

function formatMoney(value: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
}

export function AdminDashboardMetricsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE)

  const filters = useMemo(
    () => ({
      from: dateFrom || undefined,
      to: dateTo || undefined,
      granularity,
      timezone,
    }),
    [dateFrom, dateTo, granularity, timezone],
  )

  const metricsQuery = useAdminDashboardMetricsQuery(filters)
  const problem = metricsQuery.error ? getProblemDetails(metricsQuery.error) : null
  const isForbidden = problem?.status === 403
  const isUnauthorized = problem?.status === 401
  const isValidationError = problem?.status === 422

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">ADMIN</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Dashboard de métricas</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Seguimiento ejecutivo de ventas, pedidos, ticket promedio y productos destacados.
        </p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm text-slate-700">Desde</span>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-700">Hasta</span>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-700">Granularidad</span>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" value={granularity} onChange={(event) => setGranularity(event.target.value as 'day' | 'week' | 'month')}>
              <option value="day">Diaria</option>
              <option value="week">Semanal</option>
              <option value="month">Mensual</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-700">Zona horaria</span>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </label>
        </div>
      </div>

      {metricsQuery.isLoading ? <SectionMessage title="Cargando métricas..." /> : null}

      {metricsQuery.isError ? (
        <SectionMessage
          title={
            isUnauthorized
              ? 'Tu sesión no es válida para consultar métricas.'
              : isForbidden
                ? 'No tenés permisos para ver métricas administrativas.'
                : isValidationError
                  ? 'Los filtros ingresados no son válidos.'
                  : 'No pudimos cargar las métricas. Probá de nuevo en un momento.'
          }
          tone="error"
        />
      ) : null}

      {!metricsQuery.isLoading && !metricsQuery.isError && metricsQuery.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Ingresos aprobados" value={formatMoney(metricsQuery.data.summary.gross_approved_revenue)} />
            <MetricCard label="Pedidos contabilizados" value={String(metricsQuery.data.summary.counted_orders)} />
            <MetricCard label="Ticket promedio" value={formatMoney(metricsQuery.data.summary.average_ticket)} />
            <MetricCard label="Pendientes operativos" value={String(metricsQuery.data.summary.pending_operational_count)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataCard title="Ventas por período">
              {metricsQuery.data.sales_by_period.length === 0 ? (
                <EmptyState text="No hay ventas para el período seleccionado." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2">Período</th>
                      <th className="py-2">Ingresos</th>
                      <th className="py-2">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsQuery.data.sales_by_period.map((bucket) => (
                      <tr key={bucket.label} className="border-t border-slate-100">
                        <td className="py-2">{bucket.label}</td>
                        <td className="py-2">{formatMoney(bucket.gross_revenue)}</td>
                        <td className="py-2">{bucket.order_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DataCard>

            <DataCard title="Pedidos por estado">
              <ul className="space-y-2">
                {metricsQuery.data.orders_by_state.map((state) => (
                  <li key={state.state_code} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span>{state.state_name}</span>
                    <span className="font-semibold text-slate-950">{state.count}</span>
                  </li>
                ))}
              </ul>
            </DataCard>
          </div>

          <DataCard title="Top productos">
            {metricsQuery.data.top_products.length === 0 ? (
              <EmptyState text="No hay productos con ventas aprobadas en este período." />
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2">Producto</th>
                    <th className="py-2">Unidades</th>
                    <th className="py-2">Ingresos</th>
                    <th className="py-2">Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsQuery.data.top_products.map((product) => (
                    <tr key={`${product.product_id ?? 'snapshot'}-${product.display_name}`} className="border-t border-slate-100">
                      <td className="py-2">{product.display_name}</td>
                      <td className="py-2">{product.units_sold}</td>
                      <td className="py-2">{formatMoney(product.gross_revenue)}</td>
                      <td className="py-2">{product.order_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DataCard>
        </>
      ) : null}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  )
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </article>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">{text}</p>
}

function SectionMessage({ title, tone = 'neutral' }: { title: string; tone?: 'neutral' | 'error' }) {
  return (
    <div className={`rounded-3xl border border-dashed bg-white p-8 text-center ${tone === 'error' ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-600'}`}>
      <p>{title}</p>
    </div>
  )
}
