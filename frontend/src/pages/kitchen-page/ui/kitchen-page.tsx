import { useMemo, useState } from 'react'

import { useKitchenDisplay, getKitchenUrgencyLevel } from '@/features/kitchen/model/use-kitchen-display'
import { useOperationsOrderTransitionMutation } from '@/features/orders/model/hooks'
import { getProblemDetails } from '@/shared/api/problem-details'
import { cn } from '@/shared/lib/class-names'

export function KitchenPage() {
  const { connectionStatus, flashingOrderIds, groupedCards, now, queueQuery, soundEnabled, setSoundEnabled } = useKitchenDisplay()

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Cocina</span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Pantalla de cocina</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Seguimiento en vivo de pedidos confirmados y en preparación, ordenados por antigüedad de ingreso a cocina.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ConnectionStatusBadge status={connectionStatus} />
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700">
              <input
                checked={soundEnabled}
                className="size-4 rounded border-slate-300"
                onChange={(event) => setSoundEnabled(event.target.checked)}
                type="checkbox"
              />
              Alertas sonoras
            </label>
          </div>
        </div>

        {queueQuery.isError ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            No pudimos sincronizar la cola de cocina. La vista va a reintentar automáticamente.
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <KitchenColumn
          cards={groupedCards.confirmed}
          flashingOrderIds={flashingOrderIds}
          now={now}
          onSyncQueue={() => Promise.resolve(queueQuery.refetch())}
          state="CONFIRMADO"
          title="Por preparar"
        />
        <KitchenColumn
          cards={groupedCards.inPreparation}
          flashingOrderIds={flashingOrderIds}
          now={now}
          onSyncQueue={() => Promise.resolve(queueQuery.refetch())}
          state="EN_PREPARACION"
          title="En preparación"
        />
      </div>
    </section>
  )
}

function ConnectionStatusBadge({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const copy = {
    connected: 'En vivo',
    connecting: 'Reconectando...',
    disconnected: 'Sin conexión en vivo',
  } as const

  const className = {
    connected: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    connecting: 'border-amber-200 bg-amber-50 text-amber-900',
    disconnected: 'border-rose-200 bg-rose-50 text-rose-800',
  } as const

  return <span className={cn('inline-flex rounded-full border px-3 py-1 text-sm font-semibold', className[status])}>{copy[status]}</span>
}

function KitchenColumn({
  cards,
  flashingOrderIds,
  now,
  onSyncQueue,
  state,
  title,
}: {
  cards: ReturnType<typeof useKitchenDisplay>['groupedCards']['confirmed']
  flashingOrderIds: number[]
  now: number
  onSyncQueue: () => Promise<unknown>
  state: 'CONFIRMADO' | 'EN_PREPARACION'
  title: string
}) {
  const emptyCopy = useMemo(
    () => (state === 'CONFIRMADO' ? 'No hay pedidos pendientes de iniciar.' : 'No hay pedidos en preparación.'),
    [state],
  )

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{cards.length} pedidos</p>
        </div>
      </div>

      {cards.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">{emptyCopy}</p> : null}

      <div className="space-y-4">
        {cards.map((card) => (
          <KitchenOrderCardPanel
            card={card}
            isFlashing={flashingOrderIds.includes(card.id)}
            key={card.id}
            now={now}
            onSyncQueue={onSyncQueue}
          />
        ))}
      </div>
    </section>
  )
}

function KitchenOrderCardPanel({ card, isFlashing, now, onSyncQueue }: { card: ReturnType<typeof useKitchenDisplay>['cards'][number]; isFlashing: boolean; now: number; onSyncQueue: () => Promise<unknown> }) {
  const mutation = useOperationsOrderTransitionMutation(card.id)
  const urgency = getKitchenUrgencyLevel(card.kitchen_entered_at, now)
  const elapsedMinutes = Math.max(0, Math.floor((now - Date.parse(card.kitchen_entered_at)) / 60_000))
  const [actionError, setActionError] = useState<string | null>(null)

  const urgencyClasses = {
    normal: 'border-slate-200 bg-white',
    warning: 'border-amber-300 bg-amber-50',
    urgent: 'border-rose-300 bg-rose-50',
  } as const

  async function handleAction() {
    setActionError(null)
    try {
      await mutation.mutateAsync({
        to_state_code: card.state_code === 'CONFIRMADO' ? 'EN_PREPARACION' : 'EN_CAMINO',
      })
      await onSyncQueue()
    } catch (error) {
      const problem = getProblemDetails(error)
      await onSyncQueue()
      setActionError(problem?.detail ?? 'No pudimos actualizar el pedido. Reintentá en unos instantes.')
    }
  }

  return (
    <article
      className={cn(
        'rounded-3xl border p-4 shadow-sm transition',
        urgencyClasses[urgency],
        isFlashing ? 'ring-2 ring-amber-300 ring-offset-2' : '',
      )}
      data-urgency={urgency}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedido</p>
          <h3 className="text-lg font-semibold text-slate-950">{card.order_number}</h3>
          <p className="text-sm text-slate-600">{card.state_display_name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espera</p>
          <p className="text-lg font-semibold text-slate-950">{elapsedMinutes} min</p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {card.items.map((item) => (
          <li className="rounded-2xl bg-slate-50 px-3 py-2" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{item.quantity}× {item.product_name}</p>
                {item.removed_ingredients.length > 0 ? (
                  <p className="mt-1 text-sm text-slate-600">Sin {item.removed_ingredients.join(', ')}</p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {card.notes ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Nota: {card.notes}</p> : null}

      {actionError ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p> : null}

      <div className="mt-4 flex justify-end">
        <button
          className="inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={mutation.isPending}
          onClick={() => void handleAction()}
          type="button"
        >
          {card.state_code === 'CONFIRMADO' ? 'Iniciar preparación' : 'Listo'}
        </button>
      </div>
    </article>
  )
}
