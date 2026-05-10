export interface DeliveryAddress {
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
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface DeliveryAddressCreateRequest {
  recipient_name: string
  phone: string
  street: string
  street_number: string
  floor?: string | null
  apartment?: string | null
  city: string
  province: string
  postal_code: string
  reference?: string | null
  is_default?: boolean
}

export interface DeliveryAddressUpdateRequest {
  recipient_name?: string
  phone?: string
  street?: string
  street_number?: string
  floor?: string | null
  apartment?: string | null
  city?: string
  province?: string
  postal_code?: string
  reference?: string | null
  is_default?: boolean
}
