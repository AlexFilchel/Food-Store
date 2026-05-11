import { useMutation } from '@tanstack/react-query'

import { checkoutClient } from '@/entities/checkout/api/checkout-client'
import type { CheckoutPreflightRequest } from '@/entities/checkout/model/types'

export function useCheckoutPreflightMutation() {
  return useMutation({
    mutationFn: (payload: CheckoutPreflightRequest) => checkoutClient.preflight(payload),
  })
}
