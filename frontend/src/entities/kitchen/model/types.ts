export type KitchenStateCode = 'CONFIRMADO' | 'EN_PREPARACION'

export interface KitchenOrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  removed_ingredients: string[]
  line_total: string
}

export interface KitchenOrderCard {
  id: number
  order_number: string
  state_code: KitchenStateCode
  state_display_name: string
  notes: string | null
  kitchen_entered_at: string
  items: KitchenOrderItem[]
}

export interface KitchenQueueResponse {
  items: KitchenOrderCard[]
}

export type KitchenEventType =
  | 'PEDIDO_CONFIRMADO'
  | 'PEDIDO_EN_PREPARACION'
  | 'PEDIDO_EN_CAMINO'
  | 'PEDIDO_CANCELADO'

export interface KitchenEvent {
  type: KitchenEventType
  order_id: number
  occurred_at: string
  order: KitchenOrderCard | null
}
