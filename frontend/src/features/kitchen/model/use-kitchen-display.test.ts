import { act, renderHook } from '@testing-library/react'

import { useKitchenQueueQuery } from '@/features/kitchen/model/hooks'
import {
  applyKitchenEvent,
  getKitchenUrgencyLevel,
  useKitchenDisplay,
} from '@/features/kitchen/model/use-kitchen-display'
import { useAuthStore } from '@/shared/stores/auth-store'

vi.mock('@/features/kitchen/model/hooks', () => ({
  useKitchenQueueQuery: vi.fn(),
}))

class MockWebSocket {
  static instances: MockWebSocket[] = []

  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onopen: (() => void) | null = null

  constructor(_: string) {
    MockWebSocket.instances.push(this)
  }

  close() {
    this.onclose?.({} as CloseEvent)
  }

  emitClose() {
    this.onclose?.({} as CloseEvent)
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>)
  }

  emitOpen() {
    this.onopen?.()
  }
}

class MockAudioContext {
  static closeCalls = 0
  static oscillatorStarts = 0
  static oscillatorStops = 0

  currentTime = 0
  destination = {}

  createGain() {
    return {
      connect: vi.fn(),
      gain: { value: 0 },
    }
  }

  createOscillator() {
    return {
      connect: vi.fn(),
      frequency: { value: 0 },
      start: vi.fn(() => {
        MockAudioContext.oscillatorStarts += 1
      }),
      stop: vi.fn(() => {
        MockAudioContext.oscillatorStops += 1
      }),
      type: 'sine',
    }
  }

  close() {
    MockAudioContext.closeCalls += 1
    return Promise.resolve()
  }
}

describe('useKitchenDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-26T12:00:00.000Z'))
    MockWebSocket.instances = []
    MockAudioContext.closeCalls = 0
    MockAudioContext.oscillatorStarts = 0
    MockAudioContext.oscillatorStops = 0
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)
    vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
    localStorage.clear()
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: null })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('applies kitchen events and computes urgency thresholds', () => {
    const baseCards = [
      {
        id: 1,
        order_number: 'ORD-1',
        state_code: 'CONFIRMADO',
        state_display_name: 'Confirmado',
        notes: null,
        kitchen_entered_at: '2026-05-26T11:45:00.000Z',
        items: [],
      },
    ]

    const movedCards = applyKitchenEvent(baseCards, {
      type: 'PEDIDO_EN_PREPARACION',
      order_id: 1,
      occurred_at: '2026-05-26T12:00:00.000Z',
      order: {
        ...baseCards[0],
        state_code: 'EN_PREPARACION',
        state_display_name: 'En preparación',
      },
    })

    expect(movedCards[0]?.state_code).toBe('EN_PREPARACION')
    expect(applyKitchenEvent(movedCards, { type: 'PEDIDO_EN_CAMINO', order_id: 1, occurred_at: '', order: null })).toEqual([])
    expect(getKitchenUrgencyLevel('2026-05-26T11:55:30.000Z', Date.parse('2026-05-26T12:00:00.000Z'))).toBe('normal')
    expect(getKitchenUrgencyLevel('2026-05-26T11:49:30.000Z', Date.parse('2026-05-26T12:00:00.000Z'))).toBe('warning')
    expect(getKitchenUrgencyLevel('2026-05-26T11:38:30.000Z', Date.parse('2026-05-26T12:00:00.000Z'))).toBe('urgent')
  })

  it('removes a kitchen card on PEDIDO_CANCELADO', () => {
    const cards = [
      {
        id: 7,
        order_number: 'ORD-7',
        state_code: 'EN_PREPARACION',
        state_display_name: 'En preparación',
        notes: null,
        kitchen_entered_at: '2026-05-26T11:45:00.000Z',
        items: [],
      },
    ]

    expect(
      applyKitchenEvent(cards, {
        type: 'PEDIDO_CANCELADO',
        order_id: 7,
        occurred_at: '2026-05-26T12:00:00.000Z',
        order: null,
      }),
    ).toEqual([])
  })

  it('flashes and plays a beep when PEDIDO_CONFIRMADO arrives after user interaction', async () => {
    const card = {
      id: 9,
      order_number: 'ORD-ALERT',
      state_code: 'CONFIRMADO',
      state_display_name: 'Confirmado',
      notes: null,
      kitchen_entered_at: '2026-05-26T11:59:00.000Z',
      items: [],
    }

    vi.mocked(useKitchenQueueQuery).mockReturnValue({
      data: { items: [] },
      isError: false,
      refetch: vi.fn().mockResolvedValue({ data: { items: [] } }),
    } as never)

    const { result } = renderHook(() => useKitchenDisplay())

    act(() => {
      MockWebSocket.instances[0]?.emitOpen()
      window.dispatchEvent(new Event('pointerdown'))
    })

    const liveSocket = MockWebSocket.instances[MockWebSocket.instances.length - 1]
    act(() => {
      liveSocket?.emitOpen()
      liveSocket?.emitMessage({
        type: 'PEDIDO_CONFIRMADO',
        order_id: 9,
        occurred_at: '2026-05-26T12:00:00.000Z',
        order: card,
      })
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.cards.map((currentCard) => currentCard.id)).toEqual([9])
    expect(result.current.flashingOrderIds).toEqual([9])
    expect(MockAudioContext.oscillatorStarts).toBe(1)
    expect(MockAudioContext.oscillatorStops).toBe(1)
    expect(MockAudioContext.closeCalls).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })

    expect(result.current.flashingOrderIds).toEqual([])
  })

  it('polls while the connection is degraded, attempts reconnect and persists the sound toggle across remounts', async () => {
    const card = {
      id: 5,
      order_number: 'ORD-POLL',
      state_code: 'CONFIRMADO',
      state_display_name: 'Confirmado',
      notes: null,
      kitchen_entered_at: '2026-05-26T11:45:00.000Z',
      items: [],
    }
    const refetch = vi
      .fn()
      .mockResolvedValueOnce({ data: { items: [card] } })
      .mockResolvedValueOnce({ data: { items: [] } })

    vi.mocked(useKitchenQueueQuery).mockReturnValue({
      data: { items: [] },
      isError: false,
      refetch,
    } as never)

    const { result, unmount } = renderHook(() => useKitchenDisplay())
    let activeSocket = MockWebSocket.instances[0]

    act(() => {
      activeSocket?.emitOpen()
    })
    expect(result.current.connectionStatus).toBe('connected')

    act(() => {
      result.current.setSoundEnabled(false)
    })

    activeSocket = MockWebSocket.instances[MockWebSocket.instances.length - 1]

    act(() => {
      activeSocket?.emitOpen()
      activeSocket?.emitMessage({
        type: 'PEDIDO_CONFIRMADO',
        order_id: 5,
        occurred_at: '2026-05-26T12:00:00.000Z',
        order: card,
      })
    })

    expect(localStorage.getItem('food-store-kitchen-sound-enabled')).toBe('false')
    expect(result.current.cards).toHaveLength(1)

    act(() => {
      activeSocket?.emitClose()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(result.current.cards).toHaveLength(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    expect(MockWebSocket.instances).toHaveLength(3)
    const reconnectSocket = MockWebSocket.instances[MockWebSocket.instances.length - 1]

    act(() => {
      reconnectSocket?.emitOpen()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(refetch).toHaveBeenCalledTimes(2)
    expect(result.current.connectionStatus).toBe('connected')
    expect(result.current.cards).toHaveLength(0)

    unmount()

    const remounted = renderHook(() => useKitchenDisplay())
    expect(remounted.result.current.soundEnabled).toBe(false)
    remounted.unmount()
  })
})
