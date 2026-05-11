export interface CheckoutPreflightLineRequest {
  product_id: number
  quantity: number
  removed_ingredient_ids: number[]
}

export interface CheckoutPreflightRequest {
  items: CheckoutPreflightLineRequest[]
  delivery_address_id?: number
}

export interface CheckoutPreflightValidatedLine {
  product_id: number
  product_name: string
  quantity: number
  unit_price: string
  line_total: string
  customization: {
    removed_ingredients: string[]
  }
}

export interface CheckoutPreflightAddressSnapshot {
  id: number
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

export interface CheckoutPreflightResponse {
  lines: CheckoutPreflightValidatedLine[]
  delivery_address: CheckoutPreflightAddressSnapshot
  subtotal: string
}
