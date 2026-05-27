import { useEffect, useMemo, useRef, useState } from 'react'

import { buildKitchenWebSocketUrl } from '@/entities/kitchen/api/kitchen-client'
import type { KitchenEvent, KitchenOrderCard } from '@/entities/kitchen/model/types'
import { useKitchenQueueQuery } from '@/features/kitchen/model/hooks'
import { useAuthStore } from '@/shared/stores/auth-store'

const POLLING_INTERVAL_MS = 30_000
const RECONNECT_DELAY_MS = 3_000
const TIMER_REFRESH_INTERVAL_MS = 15_000
const FLASH_DURATION_MS = 1_500
const SOUND_STORAGE_KEY = 'food-store-kitchen-sound-enabled'

export type KitchenConnectionStatus = 'connecting' | 'connected' | 'disconnected'
export type KitchenUrgencyLevel = 'normal' | 'warning' | 'urgent'

function sortKitchenCards(cards: KitchenOrderCard[]) {
  return [...cards].sort((left, right) => {
    const leftAt = Date.parse(left.kitchen_entered_at)
    const rightAt = Date.parse(right.kitchen_entered_at)
    if (leftAt !== rightAt) {
      return leftAt - rightAt
    }
    return left.id - right.id
  })
}

function upsertKitchenCard(cards: KitchenOrderCard[], nextCard: KitchenOrderCard) {
  const withoutCurrent = cards.filter((card) => card.id !== nextCard.id)
  return sortKitchenCards([...withoutCurrent, nextCard])
}

export function applyKitchenEvent(cards: KitchenOrderCard[], event: KitchenEvent) {
  if (event.type === 'PEDIDO_CONFIRMADO' || event.type === 'PEDIDO_EN_PREPARACION') {
    if (!event.order) {
      return cards
    }
    return upsertKitchenCard(cards, event.order)
  }

  if (event.type === 'PEDIDO_EN_CAMINO' || event.type === 'PEDIDO_CANCELADO') {
    return cards.filter((card) => card.id !== event.order_id)
  }

  return cards
}

export function getKitchenUrgencyLevel(kitchenEnteredAt: string, now = Date.now()): KitchenUrgencyLevel {
  const elapsedMinutes = (now - Date.parse(kitchenEnteredAt)) / 60_000
  if (elapsedMinutes > 20) {
    return 'urgent'
  }
  if (elapsedMinutes >= 10) {
    return 'warning'
  }
  return 'normal'
}

function readSoundPreference() {
  if (typeof window === 'undefined') {
    return true
  }
  const stored = window.localStorage.getItem(SOUND_STORAGE_KEY)
  if (stored == null) {
    return true
  }
  return stored === 'true'
}

async function playKitchenBeep() {
  if (typeof window === 'undefined') {
    return
  }

  const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) {
    return
  }

  const context = new AudioContextCtor()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.value = 0.05
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.12)
  await context.close()
}

export function useKitchenDisplay() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queueQuery = useKitchenQueueQuery()
  const refetchQueue = queueQuery.refetch
  const [cards, setCards] = useState<KitchenOrderCard[]>([])
  const [connectionStatus, setConnectionStatus] = useState<KitchenConnectionStatus>('connecting')
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference)
  const [flashingOrderIds, setFlashingOrderIds] = useState<number[]>([])
  const [hasInteracted, setHasInteracted] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const wasDisconnectedRef = useRef(false)

  useEffect(() => {
    if (!queueQuery.data) {
      return
    }
    setCards(sortKitchenCards(queueQuery.data.items))
  }, [queueQuery.data])

  useEffect(() => {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled))
  }, [soundEnabled])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), TIMER_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const registerInteraction = () => setHasInteracted(true)
    window.addEventListener('pointerdown', registerInteraction, { passive: true })
    window.addEventListener('keydown', registerInteraction)
    return () => {
      window.removeEventListener('pointerdown', registerInteraction)
      window.removeEventListener('keydown', registerInteraction)
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setConnectionStatus('disconnected')
      return
    }

    let disposed = false

    const connect = () => {
      if (disposed) {
        return
      }

      setConnectionStatus('connecting')
      const socket = new WebSocket(buildKitchenWebSocketUrl(accessToken))
      websocketRef.current = socket

      socket.onopen = async () => {
        reconnectAttemptRef.current = 0
        setConnectionStatus('connected')
        if (wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false
          const result = await refetchQueue()
          if (result.data) {
            setCards(sortKitchenCards(result.data.items))
          }
        }
      }

      socket.onmessage = (message) => {
        const event = JSON.parse(message.data) as KitchenEvent
        setCards((current) => applyKitchenEvent(current, event))

        if (event.type === 'PEDIDO_CONFIRMADO') {
          setFlashingOrderIds((current) => (current.includes(event.order_id) ? current : [...current, event.order_id]))
          window.setTimeout(() => {
            setFlashingOrderIds((current) => current.filter((orderId) => orderId !== event.order_id))
          }, FLASH_DURATION_MS)

          if (soundEnabled && hasInteracted) {
            void playKitchenBeep()
          }
        }
      }

      socket.onerror = () => {
        socket.close()
      }

      socket.onclose = () => {
        if (disposed) {
          return
        }

        wasDisconnectedRef.current = true
        setConnectionStatus('disconnected')
        reconnectAttemptRef.current += 1
        reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current)
      }
      websocketRef.current?.close()
      websocketRef.current = null
    }
  }, [accessToken, hasInteracted, refetchQueue, soundEnabled])

  useEffect(() => {
    if (connectionStatus === 'connected') {
      return
    }

    const interval = window.setInterval(async () => {
      const result = await refetchQueue()
      if (result.data) {
        setCards(sortKitchenCards(result.data.items))
      }
    }, POLLING_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [connectionStatus, refetchQueue])

  const groupedCards = useMemo(
    () => ({
      confirmed: cards.filter((card) => card.state_code === 'CONFIRMADO'),
      inPreparation: cards.filter((card) => card.state_code === 'EN_PREPARACION'),
    }),
    [cards],
  )

  return {
    cards,
    connectionStatus,
    flashingOrderIds,
    groupedCards,
    now,
    queueQuery,
    soundEnabled,
    setSoundEnabled,
  }
}
