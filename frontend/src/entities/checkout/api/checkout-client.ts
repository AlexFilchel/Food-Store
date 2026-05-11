import { httpClient } from '@/shared/api/http-client'

import type { CheckoutPreflightRequest, CheckoutPreflightResponse } from '@/entities/checkout/model/types'

export const checkoutClient = {
  preflight: async (payload: CheckoutPreflightRequest) => {
    const response = await httpClient.post<CheckoutPreflightResponse>('/api/v1/checkout/preflight', payload)
    return response.data
  },
}
