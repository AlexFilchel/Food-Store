import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { formatPriceFromCents, multiplyPriceByQuantity } from '@/shared/lib/cart-pricing'

export interface CartItem {
  cartItemId: string
  productId: number
  slug: string
  name: string
  unitPrice: string
  quantity: number
  removedIngredientIds: number[]
  removedIngredients: CartRemovedIngredient[]
}

export interface CartRemovedIngredient {
  id: number
  name: string
}

export interface CartItemInput {
  productId: number
  slug: string
  name: string
  unitPrice: string
  quantity: number
  removedIngredients?: CartRemovedIngredient[]
}

export interface CartCheckoutPayload {
  items: Array<{
    productId: number
    quantity: number
    removedIngredientIds: number[]
  }>
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItemInput) => void
  removeLine: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clear: () => void
  totalItems: () => number
  subtotalCents: () => number
  subtotalFormatted: () => string
  toCheckoutPayload: () => CartCheckoutPayload
}

const CART_STORAGE_KEY = 'food-store-cart'

function assertValidQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('INVALID_CART_QUANTITY')
  }
}

function normalizeRemovedIngredients(removedIngredients: CartRemovedIngredient[] = []) {
  return [...removedIngredients]
    .filter((ingredient) => Number.isInteger(ingredient.id) && ingredient.id > 0)
    .reduce<CartRemovedIngredient[]>((collection, ingredient) => {
      if (collection.some((candidate) => candidate.id === ingredient.id)) {
        return collection
      }

      return [
        ...collection,
        {
          id: ingredient.id,
          name: ingredient.name.trim() || `Ingrediente ${ingredient.id}`,
        },
      ]
    }, [])
    .sort((left, right) => left.id - right.id)
}

export function createCartItemId(productId: number, removedIngredientIds: readonly number[]) {
  const signature = [...removedIngredientIds].sort((left, right) => left - right).join(',') || 'default'
  return `${productId}:${signature}`
}

function buildCartItem(item: CartItemInput): CartItem {
  assertValidQuantity(item.quantity)

  const removedIngredients = normalizeRemovedIngredients(item.removedIngredients)
  const removedIngredientIds = removedIngredients.map((ingredient) => ingredient.id)

  if (!Number.isInteger(item.productId) || item.productId < 1 || item.name.trim().length === 0 || item.unitPrice.trim().length === 0) {
    throw new Error('INVALID_CART_ITEM')
  }

  return {
    cartItemId: createCartItemId(item.productId, removedIngredientIds),
    productId: item.productId,
    slug: item.slug.trim(),
    name: item.name.trim(),
    unitPrice: item.unitPrice.trim(),
    quantity: item.quantity,
    removedIngredientIds,
    removedIngredients,
  }
}

function migratePersistedItem(item: unknown): CartItem | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const candidate = item as {
    productId?: unknown
    slug?: unknown
    name?: unknown
    unitPrice?: unknown
    quantity?: unknown
    removedIngredients?: unknown
    removedIngredientIds?: unknown
    customization?: unknown
  }

  if (
    !Number.isInteger(candidate.productId)
    || typeof candidate.name !== 'string'
    || typeof candidate.unitPrice !== 'string'
    || !Number.isInteger(candidate.quantity)
  ) {
    return null
  }

  const fallbackIds = Array.isArray(candidate.customization)
    ? candidate.customization.filter((value): value is number => Number.isInteger(value) && value > 0)
    : []

  const removedIngredients = Array.isArray(candidate.removedIngredients)
    ? candidate.removedIngredients
        .filter(
          (value): value is CartRemovedIngredient => Boolean(value) && typeof value === 'object' && Number.isInteger((value as CartRemovedIngredient).id) && typeof (value as CartRemovedIngredient).name === 'string',
        )
    : fallbackIds.map((id) => ({ id, name: `Ingrediente ${id}` }))

  return buildCartItem({
    productId: candidate.productId,
    slug: typeof candidate.slug === 'string' ? candidate.slug : '',
    name: candidate.name,
    unitPrice: candidate.unitPrice,
    quantity: candidate.quantity,
    removedIngredients,
  })
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const nextItem = buildCartItem(item)
          const existingItem = state.items.find((candidate) => candidate.cartItemId === nextItem.cartItemId)

          if (!existingItem) {
            return { items: [...state.items, nextItem] }
          }

          return {
            items: state.items.map((candidate) =>
              candidate.cartItemId === nextItem.cartItemId
                ? { ...candidate, quantity: candidate.quantity + nextItem.quantity }
                : candidate,
            ),
          }
        }),
      removeLine: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        })),
      updateQuantity: (cartItemId, quantity) => {
        assertValidQuantity(Math.max(1, quantity))

        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item,
          ),
        }))
      },
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      subtotalCents: () => get().items.reduce((total, item) => total + multiplyPriceByQuantity(item.unitPrice, item.quantity), 0),
      subtotalFormatted: () => formatPriceFromCents(get().subtotalCents()),
      toCheckoutPayload: () => ({
        items: get().items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          removedIngredientIds: item.removedIngredientIds,
        })),
      }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 2,
      partialize: (state) => ({ items: state.items }),
      migrate: (persistedState) => {
        const items = Array.isArray((persistedState as { items?: unknown[] } | undefined)?.items)
          ? (persistedState as { items: unknown[] }).items.map(migratePersistedItem).filter((item): item is CartItem => item !== null)
          : []

        return { items }
      },
    },
  ),
)
