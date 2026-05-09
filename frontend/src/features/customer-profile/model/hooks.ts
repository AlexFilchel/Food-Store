import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { customerProfileClient } from '@/entities/customer-profile/api/customer-profile-client'
import type {
  CustomerChangePasswordRequest,
  CustomerProfileUpdateRequest,
} from '@/entities/customer-profile/model/types'
import { customerProfileQueryKeys } from '@/features/customer-profile/model/customer-profile-query-keys'
import { authQueryKeys } from '@/features/auth/model/auth-query-keys'
import { useAuthStore } from '@/shared/stores/auth-store'

export function useCustomerProfileQuery() {
  return useQuery({
    queryKey: customerProfileQueryKeys.me(),
    queryFn: customerProfileClient.get,
  })
}

export function useUpdateCustomerProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CustomerProfileUpdateRequest) => customerProfileClient.update(payload),
    onSuccess: async (profile) => {
      useAuthStore.getState().setUser(profile)
      await Promise.all([
        queryClient.setQueryData(customerProfileQueryKeys.me(), profile),
        queryClient.setQueryData(authQueryKeys.me(), profile),
      ])
    },
  })
}

export function useChangeCustomerPasswordMutation() {
  return useMutation({
    mutationFn: (payload: CustomerChangePasswordRequest) => customerProfileClient.changePassword(payload),
  })
}
