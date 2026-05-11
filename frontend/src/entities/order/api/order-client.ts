import { httpClient } from '@/shared/api/http-client'

import type { OrderCreateRequest, OrderListResponse, OrderResponse } from '@/entities/order/model/types'

export const orderClient = {
  create: async (payload: OrderCreateRequest) => {
    const response = await httpClient.post<OrderResponse>('/api/v1/orders', payload)
    return response.data
  },

  list: async () => {
    const response = await httpClient.get<OrderListResponse[]>('/api/v1/orders')
    return response.data
  },

  get: async (orderId: number) => {
    const response = await httpClient.get<OrderResponse>(`/api/v1/orders/${orderId}`)
    return response.data
  },
}
