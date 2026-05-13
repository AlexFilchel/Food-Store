import { httpClient } from '@/shared/api/http-client'

import type {
  OperationsOrderDetailResponse,
  OperationsOrderListFilters,
  OperationsOrderListPageResponse,
  OperationsOrderTransitionRequest,
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

  listOperations: async (filters: OperationsOrderListFilters = {}) => {
    const response = await httpClient.get<OperationsOrderListPageResponse>('/api/v1/admin/orders', {
      params: {
        state_code: filters.state_code,
        date_from: filters.date_from,
        date_to: filters.date_to,
        customer: filters.customer,
        payment_status_code: filters.payment_status_code,
        skip: filters.skip ?? 0,
        limit: filters.limit ?? 10,
      },
    })
    return response.data
  },

  getOperations: async (orderId: number) => {
    const response = await httpClient.get<OperationsOrderDetailResponse>(`/api/v1/admin/orders/${orderId}`)
    return response.data
  },

  transitionOperations: async (orderId: number, payload: OperationsOrderTransitionRequest) => {
    const response = await httpClient.post<OperationsOrderDetailResponse>(
      `/api/v1/admin/orders/${orderId}/transition`,
      payload,
    )
    return response.data
  },
}
