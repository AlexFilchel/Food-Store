import { useMutation, useQuery } from '@tanstack/react-query'

import { orderClient } from '@/entities/order/api/order-client'
import type { OrderCreateRequest } from '@/entities/order/model/types'

export function useCreateOrderMutation() {
  return useMutation({
    mutationFn: (payload: OrderCreateRequest) => orderClient.create(payload),
  })
}

export function useOrderListQuery() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => orderClient.list(),
  })
}

export function useOrderQuery(orderId: number | undefined) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => orderClient.get(orderId!),
    enabled: orderId !== undefined,
  })
}
