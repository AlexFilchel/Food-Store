import { useMutation, useQuery } from '@tanstack/react-query'

import { paymentClient } from '@/entities/payment/api/payment-client'
import type { PaymentInitRequest } from '@/entities/payment/model/types'

export const paymentQueryKeys = {
  all: ['payments'] as const,
  byOrder: (orderId: number) => [...paymentQueryKeys.all, 'by-order', orderId] as const,
  byExternalReference: (externalReference: string) => [...paymentQueryKeys.all, 'by-external-reference', externalReference] as const,
  status: (paymentId: number) => [...paymentQueryKeys.all, 'status', paymentId] as const,
}

export function useInitPaymentMutation() {
  return useMutation({
    mutationFn: (payload: PaymentInitRequest) => paymentClient.init(payload),
  })
}

export function useRetryPaymentMutation() {
  return useMutation({
    mutationFn: (paymentId: number) => paymentClient.retry(paymentId),
  })
}

export function usePaymentByOrderQuery(orderId: number | undefined) {
  return useQuery({
    queryKey: paymentQueryKeys.byOrder(orderId!),
    queryFn: () => paymentClient.getByOrder(orderId!),
    enabled: orderId !== undefined,
    retry: false,
  })
}

export function usePaymentStatusQuery(paymentId: number | undefined) {
  return useQuery({
    queryKey: paymentQueryKeys.status(paymentId!),
    queryFn: () => paymentClient.getStatus(paymentId!),
    enabled: paymentId !== undefined,
    retry: false,
  })
}

export function usePaymentByExternalReferenceQuery(externalReference: string | undefined) {
  return useQuery({
    queryKey: paymentQueryKeys.byExternalReference(externalReference!),
    queryFn: () => paymentClient.getByExternalReference(externalReference!),
    enabled: externalReference !== undefined,
    retry: false,
  })
}
