import { useMutation, useQuery } from '@tanstack/react-query'

import { orderClient } from '@/entities/order/api/order-client'
import type { OrderCreateRequest, OrderListFilters } from '@/entities/order/model/types'

export const orderQueryKeys = {
  all: ['orders'] as const,
  list: (filters: Required<Pick<OrderListFilters, 'skip' | 'limit'>> & { state_code: string | null }) =>
    [...orderQueryKeys.all, 'list', filters] as const,
  detail: (orderId: number) => [...orderQueryKeys.all, 'detail', orderId] as const,
  paymentResult: (externalReference: string) => [...orderQueryKeys.all, 'payment-result', externalReference] as const,
}

export function useCreateOrderMutation() {
  return useMutation({
    mutationFn: (payload: OrderCreateRequest) => orderClient.create(payload),
  })
}

export function useOrderListQuery(filters: OrderListFilters) {
  const normalized = {
    state_code: filters.state_code ?? null,
    skip: filters.skip ?? 0,
    limit: filters.limit ?? 10,
  }

  return useQuery({
    queryKey: orderQueryKeys.list(normalized),
    queryFn: () => orderClient.list(normalized),
  })
}

export function useOrderQuery(orderId: number | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.detail(orderId!),
    queryFn: () => orderClient.get(orderId!),
    enabled: orderId !== undefined,
  })
}
