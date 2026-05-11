export interface OrderItemCreateRequest {
  product_id: number
  quantity: number
  removed_ingredient_ids: number[]
}

export interface OrderCreateRequest {
  items: OrderItemCreateRequest[]
  delivery_address_id?: number
  payment_method_code?: string
  notes?: string
}

export interface OrderDeliveryAddressResponse {
  recipient_name: string
  phone: string
  street: string
  street_number: string
  floor: string | null
  apartment: string | null
  city: string
  province: string
  postal_code: string
  reference: string | null
}

export interface OrderItemResponse {
  id: number
  product_id: number
  product_name: string
  product_slug: string
  unit_price: string
  quantity: number
  line_total: string
  removed_ingredients: string[]
}

export interface OrderResponse {
  id: number
  order_number: string
  state: string
  payment_method: string | null
  delivery_address: OrderDeliveryAddressResponse
  items: OrderItemResponse[]
  subtotal: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderListResponse {
  id: number
  order_number: string
  state: string
  item_count: number
  subtotal: string
  created_at: string
}
