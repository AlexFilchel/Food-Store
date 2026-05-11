import type { CartItemInput } from '@/shared/stores/cart-store'
import { useCartStore } from '@/shared/stores/cart-store'

const CART_STORAGE_KEY = 'food-store-cart'

function buildItem(overrides: Partial<CartItemInput> = {}) {
  return {
    productId: 1,
    slug: 'burger-pro',
    name: 'Burger Pro',
    unitPrice: '22.00',
    quantity: 1,
    removedIngredients: [],
    ...overrides,
  }
}

describe('useCartStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.getState().clear()
  })

  it('merges quantities for the same product and customization signature', () => {
    useCartStore.getState().addItem(buildItem({ quantity: 1, removedIngredients: [{ id: 3, name: 'Cebolla' }] }))
    useCartStore.getState().addItem(buildItem({ quantity: 2, removedIngredients: [{ id: 3, name: 'Cebolla' }] }))

    const state = useCartStore.getState()

    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toMatchObject({
      cartItemId: '1:3',
      quantity: 3,
      removedIngredientIds: [3],
    })
  })

  it('keeps separate lines for the same product with different removed ingredients', () => {
    useCartStore.getState().addItem(buildItem({ removedIngredients: [{ id: 3, name: 'Cebolla' }] }))
    useCartStore.getState().addItem(buildItem({ removedIngredients: [{ id: 4, name: 'Tomate' }] }))

    const state = useCartStore.getState()

    expect(state.items).toHaveLength(2)
    expect(state.items.map((item) => item.cartItemId)).toEqual(['1:3', '1:4'])
  })

  it('updates quantity, removes lines, clears the cart and calculates subtotal deterministically', () => {
    useCartStore.getState().addItem(buildItem({ quantity: 2 }))
    useCartStore.getState().addItem(buildItem({ productId: 2, slug: 'pizza', name: 'Pizza', unitPrice: '18.50', removedIngredients: [{ id: 9, name: 'Aceitunas' }] }))

    const [firstLine, secondLine] = useCartStore.getState().items

    useCartStore.getState().updateQuantity(firstLine.cartItemId, 3)

    expect(useCartStore.getState().totalItems()).toBe(4)
    expect(useCartStore.getState().subtotalCents()).toBe(8450)
    expect(useCartStore.getState().subtotalFormatted()).toBe('84.50')

    useCartStore.getState().updateQuantity(firstLine.cartItemId, 0)
    expect(useCartStore.getState().items[0].quantity).toBe(1)

    useCartStore.getState().removeLine(secondLine.cartItemId)
    expect(useCartStore.getState().items).toHaveLength(1)

    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toEqual([])
  })

  it('restores persisted items after a rehydrate simulation', async () => {
    useCartStore.getState().addItem(buildItem({ quantity: 2, removedIngredients: [{ id: 3, name: 'Cebolla' }] }))

    const persistedState = localStorage.getItem(CART_STORAGE_KEY)
    expect(persistedState).toContain('Burger Pro')

    useCartStore.getState().clear()
    localStorage.setItem(CART_STORAGE_KEY, persistedState ?? '')

    await useCartStore.persist.rehydrate()

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toMatchObject({
      quantity: 2,
      removedIngredientIds: [3],
    })
  })
})
