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

export interface PaymentSummaryResponse {
  payment_id: number
  status: string
  amount: string
  attempts: number
  failure_reason: string | null
  retry_allowed: boolean
}

export interface OrderHistoryResponse {
  id: number
  from_state: string | null
  to_state: string
  changed_by_user_id: number | null
  actor_type: string | null
  source: string | null
  reason_code: string | null
  note: string | null
  event_key: string | null
  created_at: string
}

export interface OrderDetailResponse extends OrderResponse {
  payment: PaymentSummaryResponse | null
  history: OrderHistoryResponse[]
}

export interface OrderListResponse {
  id: number
  order_number: string
  state: string
  item_count: number
  subtotal: string
  created_at: string
}

export interface OrderListPageResponse {
  items: OrderListResponse[]
  total: number
  skip: number
  limit: number
}

export interface OrderListFilters {
  state_code?: string
  skip?: number
  limit?: number
}
