import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { deliveryAddressClient } from '@/entities/delivery-addresses/api/delivery-address-client'
import type {
  DeliveryAddressCreateRequest,
  DeliveryAddressUpdateRequest,
} from '@/entities/delivery-addresses/model/types'
import { deliveryAddressQueryKeys } from '@/features/delivery-addresses/model/delivery-address-query-keys'

export function useDeliveryAddressListQuery() {
  return useQuery({
    queryKey: deliveryAddressQueryKeys.list(),
    queryFn: deliveryAddressClient.list,
  })
}

export function useCreateDeliveryAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DeliveryAddressCreateRequest) => deliveryAddressClient.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deliveryAddressQueryKeys.list() })
    },
  })
}

export function useUpdateDeliveryAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ addressId, payload }: { addressId: number; payload: DeliveryAddressUpdateRequest }) =>
      deliveryAddressClient.update(addressId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deliveryAddressQueryKeys.list() })
    },
  })
}

export function useDeleteDeliveryAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (addressId: number) => deliveryAddressClient.remove(addressId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deliveryAddressQueryKeys.list() })
    },
  })
}

export function useSetDefaultDeliveryAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (addressId: number) => deliveryAddressClient.setDefault(addressId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deliveryAddressQueryKeys.list() })
    },
  })
}
