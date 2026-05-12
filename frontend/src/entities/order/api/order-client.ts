import { httpClient } from '@/shared/api/http-client'

import type {
  OrderCreateRequest,
  OrderDetailResponse,
  OrderListFilters,
  OrderListPageResponse,
  OrderResponse,
} from '@/entities/order/model/types'

export const orderClient = {
  create: async (payload: OrderCreateRequest) => {
    const response = await httpClient.post<OrderResponse>('/api/v1/orders', payload)
    return response.data
  },

  list: async (filters: OrderListFilters = {}) => {
    const response = await httpClient.get<OrderListPageResponse>('/api/v1/orders', {
      params: {
        state_code: filters.state_code,
        skip: filters.skip ?? 0,
        limit: filters.limit ?? 10,
      },
    })
    return response.data
  },

  get: async (orderId: number) => {
    const response = await httpClient.get<OrderDetailResponse>(`/api/v1/orders/${orderId}`)
    return response.data
  },
}
