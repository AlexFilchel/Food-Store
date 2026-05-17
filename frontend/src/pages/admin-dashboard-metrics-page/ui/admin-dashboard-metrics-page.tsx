import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { DashboardMetricsResponse } from '@/entities/admin-dashboard-metrics/model/types'
import { useAdminDashboardMetricsQuery } from '@/features/admin-dashboard-metrics/model/hooks'
import { getProblemDetails } from '@/shared/api/problem-details'
import { appEnv } from '@/shared/config/env'

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'
const PREF_KEY = 'admin.dashboard.view.v1'

type DatePreset = 'today' | 'last_7_days' | 'last_30_days' | 'current_month' | 'custom'
type ViewMode = 'chart' | 'table'

function formatMoney(value: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
}

function formatShortDateTime(value: string) {
  return new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function presetRange(preset: DatePreset) {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (preset === 'today') {
    return { from: toDateInput(today), to: toDateInput(new Date(today.getTime() + 86400000)) }
  }
  if (preset === 'last_7_days') {
    return { from: toDateInput(new Date(today.getTime() - 6 * 86400000)), to: toDateInput(new Date(today.getTime() + 86400000)) }
  }
  if (preset === 'last_30_days') {
    return { from: toDateInput(new Date(today.getTime() - 29 * 86400000)), to: toDateInput(new Date(today.getTime() + 86400000)) }
  }
  return {
    from: toDateInput(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))),
    to: toDateInput(new Date(today.getTime() + 86400000)),
  }
}

function readStoredPreference(): { preset: DatePreset; timezone: string; view_mode: ViewMode } {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return { preset: 'last_7_days', timezone: DEFAULT_TIMEZONE, view_mode: 'table' }
    const parsed = JSON.parse(raw) as {
      version?: number
      preset?: DatePreset
      timezone?: string
      view_mode?: ViewMode
    }
    if (parsed.version !== 1) throw new Error('unsupported version')
    const preset = parsed.preset ?? 'last_7_days'
    const viewMode = parsed.view_mode ?? 'table'
    const timezone = parsed.timezone?.trim() || DEFAULT_TIMEZONE
    if (!['today', 'last_7_days', 'last_30_days', 'current_month', 'custom'].includes(preset)) throw new Error('invalid preset')
    if (!['table', 'chart'].includes(viewMode)) throw new Error('invalid view mode')
    return { preset, timezone, view_mode: viewMode }
  } catch {
    return { preset: 'last_7_days', timezone: DEFAULT_TIMEZONE, view_mode: 'table' }
  }
}

function savePreference(preset: DatePreset, timezone: string, viewMode: ViewMode, from: string, to: string) {
  localStorage.setItem(
    PREF_KEY,
    JSON.stringify({
      version: 1,
      preset,
      custom_range: preset === 'custom' ? { from, to } : null,
      granularity: 'day',
      timezone,
      view_mode: viewMode,
      chart_kind: 'line',
      updated_at: new Date().toISOString(),
    }),
  )
}

export function AdminDashboardMetricsPage() {
  const stored = readStoredPreference()
  const [preset, setPreset] = useState<DatePreset>(stored.preset)
  const initialRange = presetRange(stored.preset === 'custom' ? 'last_7_days' : stored.preset)
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
  const [timezone, setTimezone] = useState(stored.timezone)
  const [viewMode, setViewMode] = useState<ViewMode>(stored.view_mode)

  const filters = useMemo(
    () => ({ from: dateFrom || undefined, to: dateTo || undefined, granularity, timezone }),
    [dateFrom, dateTo, granularity, timezone],
  )

  const metricsQuery = useAdminDashboardMetricsQuery(filters)
  const problem = metricsQuery.error ? getProblemDetails(metricsQuery.error) : null
  const isForbidden = problem?.status === 403
  const isUnauthorized = problem?.status === 401
  const isValidationError = problem?.status === 422
  const effectiveTimezone = metricsQuery.data?.effective_filters?.timezone ?? timezone

  const isUpgradeEnabled = appEnv.adminDashboardUxUpgrade
  const isTrendsEnabled = appEnv.adminDashboardUxUpgradeTrends

  const onPresetChange = (nextPreset: DatePreset) => {
    setPreset(nextPreset)
    if (nextPreset !== 'custom') {
      const range = presetRange(nextPreset)
      setDateFrom(range.from)
      setDateTo(range.to)
      savePreference(nextPreset, timezone, viewMode, range.from, range.to)
    }
  }

  const onManualDateChange = (kind: 'from' | 'to', value: string) => {
    setPreset('custom')
    if (kind === 'from') setDateFrom(value)
    else setDateTo(value)
    savePreference('custom', timezone, viewMode, kind === 'from' ? value : dateFrom, kind === 'to' ? value : dateTo)
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">ADMIN</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">Dashboard de métricas</h2>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2"><span className="text-sm text-slate-700">Preset</span>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" value={preset} onChange={(e) => onPresetChange(e.target.value as DatePreset)}>
              <option value="today">Hoy</option><option value="last_7_days">Últimos 7 días</option><option value="last_30_days">Últimos 30 días</option><option value="current_month">Mes actual</option><option value="custom">Personalizado</option>
            </select>
          </label>
          <label className="space-y-2"><span className="text-sm text-slate-700">Desde</span>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" type="date" value={dateFrom} onChange={(event) => onManualDateChange('from', event.target.value)} />
          </label>
          <label className="space-y-2"><span className="text-sm text-slate-700">Hasta (exclusivo)</span>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" type="date" value={dateTo} onChange={(event) => onManualDateChange('to', event.target.value)} />
          </label>
          <label className="space-y-2"><span className="text-sm text-slate-700">Zona horaria</span>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" value={timezone} onChange={(event) => { setTimezone(event.target.value); savePreference(preset, event.target.value, viewMode, dateFrom, dateTo) }} />
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-500">Zona horaria efectiva: <strong>{effectiveTimezone}</strong></p>
      </div>

      {metricsQuery.isLoading ? <SectionMessage title="Cargando métricas..." /> : null}
      {metricsQuery.isError ? <SectionMessage title={isUnauthorized ? 'Tu sesión no es válida para consultar métricas.' : isForbidden ? 'No tenés permisos para ver métricas administrativas.' : isValidationError ? 'Los filtros ingresados no son válidos.' : 'No pudimos cargar las métricas. Probá de nuevo en un momento.'} tone="error" /> : null}

      {!metricsQuery.isLoading && !metricsQuery.isError && metricsQuery.data ? <DashboardContent data={metricsQuery.data} isUpgradeEnabled={isUpgradeEnabled} isTrendsEnabled={isTrendsEnabled} viewMode={viewMode} onViewModeChange={(nextMode) => { setViewMode(nextMode); savePreference(preset, timezone, nextMode, dateFrom, dateTo) }} dateFrom={dateFrom} dateTo={dateTo} /> : null}
    </section>
  )
}

function DashboardContent({ data, isUpgradeEnabled, isTrendsEnabled, viewMode, onViewModeChange, dateFrom, dateTo }: { data: DashboardMetricsResponse; isUpgradeEnabled: boolean; isTrendsEnabled: boolean; viewMode: ViewMode; onViewModeChange: (mode: ViewMode) => void; dateFrom: string; dateTo: string }) {
  const comparisons = data.kpi_comparisons ?? []

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingresos aprobados" value={formatMoney(data.summary.gross_approved_revenue)} comparison={comparisons.find((x) => x.key === 'gross_approved_revenue')} enabled={isUpgradeEnabled} />
        <MetricCard label="Pedidos contabilizados" value={String(data.summary.counted_orders)} comparison={comparisons.find((x) => x.key === 'counted_orders')} enabled={isUpgradeEnabled} />
        <MetricCard label="Ticket promedio" value={formatMoney(data.summary.average_ticket)} comparison={comparisons.find((x) => x.key === 'average_ticket')} enabled={isUpgradeEnabled} />
        <MetricCard label="Pendientes operativos" value={String(data.summary.pending_operational_count)} enabled={false} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataCard title="Ventas por período">
          {isTrendsEnabled ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => onViewModeChange('chart')} aria-label="Ver gráfico">Gráfico</button>
                <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => onViewModeChange('table')} aria-label="Ver tabla">Tabla</button>
              </div>
              {viewMode === 'chart' ? <TrendChart data={data.sales_by_period} /> : null}
            </div>
          ) : null}
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Período</th><th className="py-2">Ingresos</th><th className="py-2">Pedidos</th></tr></thead>
            <tbody>
              {data.sales_by_period.map((bucket) => (
                <tr key={`${bucket.label}-${bucket.bucket_start ?? ''}`} className="border-t border-slate-100"><td className="py-2">{bucket.label}</td><td className="py-2">{formatMoney(bucket.gross_revenue)}</td><td className="py-2">{bucket.order_count}</td></tr>
              ))}
            </tbody>
          </table>
        </DataCard>

        <DataCard title="Salud operativa">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between"><span>Pendientes (estado)</span><Link to={`/admin/orders?state_code=PENDIENTE&date_from=${dateFrom}&date_to=${dateTo}`}>{data.health?.pending_orders_count ?? 'N/D'}</Link></li>
            <li className="flex items-center justify-between"><span>Cancelados (estado)</span><Link to={`/admin/orders?state_code=CANCELADO&date_from=${dateFrom}&date_to=${dateTo}`}>{data.health?.cancelled_orders_count ?? 'N/D'}</Link></li>
            <li className="flex items-center justify-between"><span>Pagos rechazados</span><Link to={`/admin/orders?payment_status_code=REJECTED&date_from=${dateFrom}&date_to=${dateTo}`}>{data.health?.rejected_payments_count ?? 'N/D'}</Link></li>
            <li className="flex items-center justify-between"><span>Trabados</span><Link to={`/admin/orders?state_code=PENDIENTE&payment_status_code=PENDING&date_from=${dateFrom}&date_to=${dateTo}&stuck=true`}>{data.health?.stuck_orders_count ?? 'N/D'}</Link></li>
          </ul>
        </DataCard>
      </div>

      <DataCard title="Top productos">
        {data.top_products.length === 0 ? <EmptyState text="No hay productos con ventas aprobadas en este período." /> : (
          <table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th className="py-2">Producto</th><th className="py-2">Unidades</th><th className="py-2">Ingresos</th><th className="py-2">Pedidos</th><th className="py-2">Acción</th></tr></thead><tbody>
            {data.top_products.map((product) => (
              <tr key={`${product.product_id ?? 'snapshot'}-${product.display_name}`} className="border-t border-slate-100"><td className="py-2">{product.display_name}</td><td className="py-2">{product.units_sold}</td><td className="py-2">{formatMoney(product.gross_revenue)}</td><td className="py-2">{product.order_count}</td><td className="py-2"><button type="button" disabled className="rounded border px-2 py-1 text-xs text-slate-500">Drill-down no disponible sin hidratación de filtros en productos</button></td></tr>
            ))}
          </tbody></table>
        )}
      </DataCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <DataCard title="Insights de categorías">
          {(data.category_insights?.length ?? 0) > 0 ? (
            <PieChart categories={data.category_insights ?? []} />
          ) : <EmptyState text="No hay insights de categorías para el rango seleccionado." />}
        </DataCard>
        <DataCard title="Ventas recientes">
          {(data.recent_sales?.length ?? 0) > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.recent_sales?.map((sale) => (
                <li key={sale.order_id} className="rounded bg-slate-50 px-2 py-2">
                  <div className="flex items-center justify-between"><strong>{sale.order_number}</strong><span>{formatMoney(sale.total_amount)}</span></div>
                  <div className="text-xs text-slate-600">{sale.customer_name} · {sale.state_code} · {sale.payment_status_code} · {formatShortDateTime(sale.approved_at)}</div>
                </li>
              ))}
            </ul>
          ) : <EmptyState text="No hay ventas recientes para el rango seleccionado." />}
        </DataCard>
        <DataCard title="Alertas operativas">
          {(data.operational_alerts?.length ?? 0) > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.operational_alerts?.map((alert, index) => (
                <li key={`${alert.alert_type}-${index}`} className={`rounded px-2 py-2 ${alert.severity === 'high' ? 'bg-rose-100 text-rose-800' : alert.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
                  <p className="font-semibold">{alert.message}</p>
                  <p className="text-xs">Tipo: {alert.alert_type} · Conteo: {alert.count}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-emerald-700">Sin alertas críticas para el período seleccionado.</p>}
        </DataCard>
      </div>
    </>
  )
}

function MetricCard({ label, value, comparison, enabled }: { label: string; value: string; comparison?: DashboardMetricsResponse['kpi_comparisons'] extends Array<infer T> ? T : never; enabled?: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>{enabled ? <p className="mt-1 text-sm text-slate-600" aria-label={`Comparación ${label}`}>{comparison?.is_comparable ? `${comparison.delta_percent}% (${comparison.trend ?? 'flat'})` : 'Comparación no disponible'}</p> : null}</article>
  )
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) { return <article className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-semibold text-slate-950">{title}</h3><div className="mt-3">{children}</div></article> }
function EmptyState({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">{text}</p> }
function SectionMessage({ title, tone = 'neutral' }: { title: string; tone?: 'neutral' | 'error' }) { return <div className={`rounded-3xl border border-dashed bg-white p-8 text-center ${tone === 'error' ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-600'}`}><p>{title}</p></div> }

function TrendChart({ data }: { data: DashboardMetricsResponse['sales_by_period'] }) {
  if (data.length === 0) return <EmptyState text="No hay datos para graficar." />
  const width = 640
  const height = 220
  const max = Math.max(...data.map((item) => Number(item.gross_revenue)), 1)
  const step = width / Math.max(data.length - 1, 1)
  const points = data.map((item, index) => {
    const x = index * step
    const y = height - (Number(item.gross_revenue) / max) * (height - 20)
    return `${x},${y}`
  }).join(' ')

  return (
    <div role="img" aria-label="Gráfico de tendencia de ingresos por período" className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-[560px]">
        <polyline fill="none" stroke="#0f172a" strokeWidth="2" points={points} />
        {data.map((item, index) => {
          const x = index * step
          const y = height - (Number(item.gross_revenue) / max) * (height - 20)
          return <circle key={`${item.label}-dot`} cx={x} cy={y} r="3" fill="#0f172a" />
        })}
      </svg>
    </div>
  )
}

function PieChart({ categories }: { categories: DashboardMetricsResponse['category_insights'] }) {
  if (categories.length === 0) return <EmptyState text="No hay datos para graficar." />
  
  const size = 200
  const radius = 70
  const cx = size / 2
  const cy = size / 2
  
  // Color palette for pie slices
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
  
  // Calculate angles for each slice
  let currentAngle = -90 // Start from top
  const slices = categories.map((cat, index) => {
    const sliceAngle = (Number(cat.revenue_share_percent) / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle
    
    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    // Calculate start and end points
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    
    // Large arc flag (1 if angle > 180)
    const largeArcFlag = sliceAngle > 180 ? 1 : 0
    
    // SVG path for the slice
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
    
    // Calculate label position (middle of slice)
    const labelAngle = startAngle + sliceAngle / 2
    const labelRad = (labelAngle * Math.PI) / 180
    const labelX = cx + (radius * 0.65) * Math.cos(labelRad)
    const labelY = cy + (radius * 0.65) * Math.sin(labelRad)
    
    currentAngle = endAngle
    
    return {
      path,
      color: colors[index % colors.length],
      category: cat,
      labelX,
      labelY,
    }
  })
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div role="img" aria-label="Gráfico de torta de distribución de categorías">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
          {slices.map((slice, index) => (
            <g key={`slice-${index}`}>
              <path d={slice.path} fill={slice.color} stroke="white" strokeWidth="2" />
              <text
                x={slice.labelX}
                y={slice.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-semibold text-white pointer-events-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {slice.category.revenue_share_percent}%
              </text>
            </g>
          ))}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="w-full space-y-2">
        {slices.map((slice, index) => (
          <div key={`legend-${index}`} className="flex items-start gap-2 text-sm">
            <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <div className="flex-1">
              <div className="font-medium text-slate-900">{slice.category.category_name}</div>
              <div className="text-xs text-slate-600">{formatMoney(slice.category.gross_revenue)} · {slice.category.revenue_share_percent}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
