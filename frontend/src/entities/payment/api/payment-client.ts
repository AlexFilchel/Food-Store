import { httpClient } from '@/shared/api/http-client'

import type {
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentRetryResponse,
  PaymentStatusResponse,
} from '@/entities/payment/model/types'

export const paymentClient = {
  init: async (payload: PaymentInitRequest) => {
    const response = await httpClient.post<PaymentInitResponse>('/api/v1/payments/init', payload)
    return response.data
  },

  getStatus: async (paymentId: number) => {
    const response = await httpClient.get<PaymentStatusResponse>(`/api/v1/payments/${paymentId}/status`)
    return response.data
  },

  getByOrder: async (orderId: number) => {
    const response = await httpClient.get<PaymentStatusResponse>(`/api/v1/payments/by-order/${orderId}`)
    return response.data
  },

  getByExternalReference: async (externalReference: string) => {
    const response = await httpClient.get<PaymentStatusResponse>(`/api/v1/payments/result/${externalReference}`, {
      headers: {
        'x-skip-global-error-feedback': 'true',
      },
    })
    return response.data
  },

  retry: async (paymentId: number) => {
    const response = await httpClient.post<PaymentRetryResponse>(`/api/v1/payments/${paymentId}/retry`)
    return response.data
  },
}
