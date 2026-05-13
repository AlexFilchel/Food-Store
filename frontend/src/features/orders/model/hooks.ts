import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { orderClient } from '@/entities/order/api/order-client'
import type {
  OperationsOrderListFilters,
  OperationsOrderTransitionRequest,
  OrderCreateRequest,
  OrderListFilters,
} from '@/entities/order/model/types'

export const orderQueryKeys = {
  all: ['orders'] as const,
  list: (filters: Required<Pick<OrderListFilters, 'skip' | 'limit'>> & { state_code: string | null }) =>
    [...orderQueryKeys.all, 'list', filters] as const,
  detail: (orderId: number) => [...orderQueryKeys.all, 'detail', orderId] as const,
  paymentResult: (externalReference: string) => [...orderQueryKeys.all, 'payment-result', externalReference] as const,
  operations: {
    all: ['orders', 'operations'] as const,
    list: (filters: Required<Pick<OperationsOrderListFilters, 'skip' | 'limit'>> & {
      state_code: string | null
      date_from: string | null
      date_to: string | null
      customer: string | null
      payment_status_code: string | null
    }) => [...orderQueryKeys.operations.all, 'list', filters] as const,
    detail: (orderId: number) => [...orderQueryKeys.operations.all, 'detail', orderId] as const,
  },
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

export function useOperationsOrderListQuery(filters: OperationsOrderListFilters) {
  const normalized = {
    state_code: filters.state_code ?? null,
    date_from: filters.date_from ?? null,
    date_to: filters.date_to ?? null,
    customer: filters.customer ?? null,
    payment_status_code: filters.payment_status_code ?? null,
    skip: filters.skip ?? 0,
    limit: filters.limit ?? 10,
  }

  return useQuery({
    queryKey: orderQueryKeys.operations.list(normalized),
    queryFn: () => orderClient.listOperations(normalized),
  })
}

export function useOperationsOrderQuery(orderId: number | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.operations.detail(orderId!),
    queryFn: () => orderClient.getOperations(orderId!),
    enabled: orderId !== undefined,
  })
}

export function useOperationsOrderTransitionMutation(orderId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: OperationsOrderTransitionRequest) => orderClient.transitionOperations(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.operations.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.operations.all })
    },
  })
}
