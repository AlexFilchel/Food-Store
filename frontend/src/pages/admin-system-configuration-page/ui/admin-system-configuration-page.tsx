import { useMemo, useState } from 'react'

import type { SystemConfigurationItem } from '@/entities/system-configuration/model/types'
import { useAdminSystemConfigurationMutation, useAdminSystemConfigurationQuery } from '@/features/system-configuration/model/hooks'
import { getFieldErrors, getProblemDetails } from '@/shared/api/problem-details'

const SENSITIVE_KEYS = new Set([
  'store.ordering_enabled',
  'orders.max_items_per_order',
  'orders.max_quantity_per_item',
  'orders.pending_payment_expiration_minutes',
])

const CATEGORY_LABELS: Record<string, string> = {
  business: 'Negocio',
  orders: 'Pedidos',
  store: 'Tienda',
}

const KEY_LABELS: Record<string, string> = {
  'business.timezone': 'Zona horaria del negocio',
  'orders.max_items_per_order': 'Máximo de productos por pedido',
  'orders.max_quantity_per_item': 'Cantidad máxima por producto',
  'orders.pending_payment_expiration_minutes': 'Minutos de vencimiento del pago pendiente',
  'store.address_text': 'Dirección pública del local',
  'store.contact_email': 'Correo electrónico de contacto público',
  'store.contact_phone': 'Teléfono de contacto público',
  'store.ordering_enabled': 'Habilitar pedidos nuevos',
  'store.public_name': 'Nombre público del negocio',
}

type DraftState = Record<string, string | boolean>

export function AdminSystemConfigurationPage() {
  const query = useAdminSystemConfigurationQuery()
  const mutation = useAdminSystemConfigurationMutation()
  const [draft, setDraft] = useState<DraftState>({})
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [globalMessage, setGlobalMessage] = useState<string | null>(null)

  const items = query.data?.items ?? []
  const fieldErrors = getFieldErrors(mutation.error)
  const problem = getProblemDetails(mutation.error)
  const isStaleConflict = problem?.status === 409 || problem?.code === 'SYSTEM_CONFIGURATION_STALE_VERSION'

  const grouped = useMemo(() => {
    return items.reduce<Record<string, SystemConfigurationItem[]>>((accumulator, item) => {
      accumulator[item.category] = [...(accumulator[item.category] ?? []), item]
      return accumulator
    }, {})
  }, [items])

  const dirtyKeys = useMemo(
    () =>
      items
        .filter((item) => item.key in draft)
        .filter((item) => areDifferent(item, draft[item.key])),
    [draft, items],
  )

  const isDirty = dirtyKeys.length > 0

  const handleCancel = () => {
    setDraft({})
    setLocalErrors({})
    setGlobalMessage(null)
  }

  const handleSave = () => {
    if (!isDirty) {
      return
    }

    setLocalErrors({})
    setGlobalMessage(null)

    const typedErrors: Record<string, string> = {}
    const updates: Record<string, { value: string | boolean | number | null; expected_version?: number }> = {}

    for (const item of dirtyKeys) {
      const typed = coerceDraftValue(item, draft[item.key])
      if (typed.error) {
        typedErrors[item.key] = typed.error
        continue
      }
      updates[item.key] = {
        value: typed.value,
        expected_version: item.version,
      }
    }

    if (Object.keys(typedErrors).length > 0) {
      setLocalErrors(typedErrors)
      return
    }

    const sensitiveChanges = dirtyKeys.filter((item) => SENSITIVE_KEYS.has(item.key))
    if (sensitiveChanges.length > 0) {
      const accepted = window.confirm(
        `Vas a cambiar configuración operativa sensible:\n- ${sensitiveChanges.map((entry) => getDisplayKey(entry.key)).join('\n- ')}\n\n¿Confirmás aplicar estos cambios?`,
      )
      if (!accepted) {
        return
      }
    }

    mutation.mutate(
      { updates },
      {
        onSuccess: () => {
          setDraft({})
          setGlobalMessage('Configuración actualizada correctamente.')
        },
      },
    )
  }

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-950">Configuración del sistema</h2>
        <p className="text-sm text-slate-600">Parámetros globales operativos con validación y control de concurrencia.</p>
      </header>

      {query.isLoading ? <p>Cargando configuración...</p> : null}
      {query.isError ? <p role="alert">No se pudo cargar la configuración.</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? <p>No hay claves configurables.</p> : null}

      {!query.isLoading && !query.isError
        ? Object.entries(grouped).map(([category, categoryItems]) => (
            <article key={category} className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">{getDisplayCategory(category)}</h3>
              <div className="space-y-4">
                {categoryItems.map((item) => {
                  const draftValue = draft[item.key]
                  const value = draftValue ?? toDraftValue(item.effective_value, item.type)
                  const error = localErrors[item.key] ?? fieldErrors[`updates.${item.key}.value`]

                  return (
                    <div key={item.key} className="space-y-2 rounded-md border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-semibold text-slate-800" htmlFor={item.key}>{getDisplayKey(item.key)}</label>
                        <span className="text-xs text-slate-500">{item.editable ? 'Editable' : 'Solo lectura'}</span>
                      </div>
                      <TypedControl
                        item={item}
                        value={value}
                        onChange={(next) => setDraft((current) => ({ ...current, [item.key]: next }))}
                      />
                      <p className="text-xs text-slate-500">{item.description}</p>
                      <p className="text-xs text-slate-500">Valor por defecto: {formatConfigValue(item.default_value)} · Valor actual: {formatConfigValue(item.effective_value)}</p>
                      {error ? <p className="text-xs text-rose-600" role="alert">{error}</p> : null}
                    </div>
                  )
                })}
              </div>
            </article>
          ))
        : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={mutation.isPending || !isDirty}
            onClick={handleSave}
            type="button"
          >
            Guardar cambios
          </button>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            disabled={mutation.isPending || !isDirty}
            onClick={handleCancel}
            type="button"
          >
            Cancelar
          </button>
        </div>

        {globalMessage ? <p className="text-sm text-emerald-700">{globalMessage}</p> : null}
        {mutation.isError && !isStaleConflict ? <p className="text-sm text-rose-700">{problem?.detail ?? 'No se pudo actualizar la configuración.'}</p> : null}
        {isStaleConflict ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p>La configuración cambió en paralelo. Refrescá los datos y volvé a intentar.</p>
            <button className="mt-2 rounded-md border border-amber-400 px-3 py-1" onClick={() => query.refetch()} type="button">
              Refrescar configuración
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function TypedControl({ item, value, onChange }: { item: SystemConfigurationItem; value: string | boolean; onChange: (value: string | boolean) => void }) {
  if (item.type === 'boolean') {
    return (
      <input
        aria-label={item.key}
        checked={Boolean(value)}
        disabled={!item.editable}
        id={item.key}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    )
  }

  if (item.type === 'integer') {
    return (
      <input
        aria-label={item.key}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        disabled={!item.editable}
        id={item.key}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={String(value)}
      />
    )
  }

  return (
    <input
      aria-label={item.key}
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      disabled={!item.editable}
      id={item.key}
      onChange={(event) => onChange(event.target.value)}
      type="text"
      value={String(value)}
    />
  )
}

function toDraftValue(value: string | boolean | number | null, type: SystemConfigurationItem['type']): string | boolean {
  if (type === 'boolean') {
    return Boolean(value)
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function coerceDraftValue(item: SystemConfigurationItem, draftValue: string | boolean | undefined) {
  if (item.type === 'boolean') {
    if (typeof draftValue !== 'boolean') return { error: 'Valor booleano inválido.' as const }
    return { value: draftValue }
  }

  const raw = typeof draftValue === 'string' ? draftValue : ''

  if (item.type === 'integer') {
    if (raw.trim() === '' || Number.isNaN(Number(raw))) {
      return { error: 'Ingresá un número entero válido.' as const }
    }
    const value = Number(raw)
    if (!Number.isInteger(value)) return { error: 'El valor debe ser entero.' as const }
    if (item.validation.min !== null && value < item.validation.min) return { error: `Debe ser >= ${item.validation.min}` as const }
    if (item.validation.max !== null && value > item.validation.max) return { error: `Debe ser <= ${item.validation.max}` as const }
    return { value }
  }

  if (item.type === 'nullable_string') {
    const normalized = raw.trim()
    return { value: normalized === '' ? null : normalized }
  }

  const normalized = raw.trim()
  if (normalized.length === 0) {
    return { error: 'Este campo no puede estar vacío.' as const }
  }
  return { value: normalized }
}

function getDisplayCategory(category: string) {
  return CATEGORY_LABELS[category] ?? category
}

function getDisplayKey(key: string) {
  return KEY_LABELS[key] ?? key
}

function formatConfigValue(value: string | boolean | number | null) {
  if (value === null || value === undefined || value === '') {
    return 'Sin definir'
  }
  return String(value)
}

function areDifferent(item: SystemConfigurationItem, draftValue: string | boolean | undefined) {
  const typed = coerceDraftValue(item, draftValue)
  if ('error' in typed) {
    return true
  }
  return typed.value !== item.effective_value
}
