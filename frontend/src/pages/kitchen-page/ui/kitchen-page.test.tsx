import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useKitchenDisplay } from '@/features/kitchen/model/use-kitchen-display'
import { useOperationsOrderTransitionMutation } from '@/features/orders/model/hooks'
import { KitchenPage } from '@/pages/kitchen-page/ui/kitchen-page'

const defaultQueueRefetch = vi.fn().mockResolvedValue({ data: { items: [] } })

vi.mock('@/features/kitchen/model/use-kitchen-display', () => ({
  useKitchenDisplay: vi.fn(),
  getKitchenUrgencyLevel: () => 'warning',
}))

vi.mock('@/features/orders/model/hooks', () => ({
  useOperationsOrderTransitionMutation: vi.fn(),
}))

describe('KitchenPage', () => {
  beforeEach(() => {
    vi.mocked(useOperationsOrderTransitionMutation).mockImplementation((orderId: number) => ({
      mutateAsync: vi.fn().mockResolvedValue(orderId),
      isPending: false,
    }) as never)

    vi.mocked(useKitchenDisplay).mockReturnValue({
      cards: [],
      connectionStatus: 'connected',
      flashingOrderIds: [1],
      groupedCards: {
        confirmed: [
          {
            id: 1,
            order_number: 'ORD-0001',
            state_code: 'CONFIRMADO',
            state_display_name: 'Confirmado',
            notes: 'Sin cebolla',
            kitchen_entered_at: '2026-05-26T11:55:00.000Z',
            items: [{ id: 11, product_id: 3, product_name: 'Pizza Muzzarella', quantity: 2, removed_ingredients: ['cebolla'], line_total: '20.00' }],
          },
        ],
        inPreparation: [
          {
            id: 2,
            order_number: 'ORD-0002',
            state_code: 'EN_PREPARACION',
            state_display_name: 'En preparación',
            notes: null,
            kitchen_entered_at: '2026-05-26T11:40:00.000Z',
            items: [{ id: 12, product_id: 4, product_name: 'Empanada', quantity: 6, removed_ingredients: [], line_total: '12.00' }],
          },
        ],
      },
      now: Date.parse('2026-05-26T12:00:00.000Z'),
      queueQuery: { isError: false, refetch: defaultQueueRefetch },
      soundEnabled: true,
      setSoundEnabled: vi.fn(),
    } as never)
  })

  afterEach(() => {
    defaultQueueRefetch.mockClear()
  })

  it('renders kitchen cards and dispatches state transitions', async () => {
    const mutations = new Map<number, { mutateAsync: ReturnType<typeof vi.fn> }>()
    vi.mocked(useOperationsOrderTransitionMutation).mockImplementation((orderId: number) => {
      const mutation = { mutateAsync: vi.fn().mockResolvedValue(orderId), isPending: false }
      mutations.set(orderId, mutation)
      return mutation as never
    })

    render(<KitchenPage />)

    expect(screen.getByRole('heading', { name: 'Pantalla de cocina' })).toBeInTheDocument()
    expect(screen.getByText('ORD-0001')).toBeInTheDocument()
    expect(screen.getByText('Confirmado')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
    expect(screen.getByText('2× Pizza Muzzarella')).toBeInTheDocument()
    expect(screen.getByText('Nota: Sin cebolla')).toBeInTheDocument()
    expect(screen.getByText('ORD-0002')).toBeInTheDocument()
    expect(screen.getAllByText('En preparación').length).toBeGreaterThan(0)
    expect(screen.getByText('20 min')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Iniciar preparación' }))
    await user.click(screen.getByRole('button', { name: 'Listo' }))

    await waitFor(() => {
      expect(mutations.get(1)?.mutateAsync).toHaveBeenCalledWith({ to_state_code: 'EN_PREPARACION' })
      expect(mutations.get(2)?.mutateAsync).toHaveBeenCalledWith({ to_state_code: 'EN_CAMINO' })
    })
  })

  it('refetches the kitchen queue and shows a conflict message when the order is stale', async () => {
    const refetchMock = vi.fn().mockResolvedValue({ data: { items: [] } })
    vi.mocked(useKitchenDisplay).mockReturnValue({
      cards: [],
      connectionStatus: 'connected',
      flashingOrderIds: [1],
      groupedCards: {
        confirmed: [
          {
            id: 1,
            order_number: 'ORD-0001',
            state_code: 'CONFIRMADO',
            state_display_name: 'Confirmado',
            notes: 'Sin cebolla',
            kitchen_entered_at: '2026-05-26T11:55:00.000Z',
            items: [{ id: 11, product_id: 3, product_name: 'Pizza Muzzarella', quantity: 2, removed_ingredients: ['cebolla'], line_total: '20.00' }],
          },
        ],
        inPreparation: [],
      },
      now: Date.parse('2026-05-26T12:00:00.000Z'),
      queueQuery: { isError: false, refetch: refetchMock },
      soundEnabled: true,
      setSoundEnabled: vi.fn(),
    } as never)

    vi.mocked(useOperationsOrderTransitionMutation).mockImplementation((orderId: number) => ({
      mutateAsync: orderId === 1
        ? vi.fn().mockRejectedValue(new Error('stale transition'))
        : vi.fn().mockResolvedValue(orderId),
      isPending: false,
    }) as never)

    render(<KitchenPage />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Iniciar preparación' }))

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText('No pudimos actualizar el pedido. Reintentá en unos instantes.')).toBeInTheDocument()
    })
  })
})
