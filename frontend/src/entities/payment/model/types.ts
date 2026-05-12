export interface PaymentInitRequest {
  order_id: number
}

export interface PaymentInitResponse {
  payment_id: number
  preference_id: string
  init_point: string
  sandbox_init_point: string | null
  external_reference: string
}

export interface PaymentStatusResponse {
  payment_id: number
  order_id: number
  status: string
  mp_payment_id: string | null
  amount: string
  attempts: number
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface PaymentRetryResponse {
  payment_id: number
  preference_id: string
  init_point: string
  sandbox_init_point: string | null
  attempts: number
}
