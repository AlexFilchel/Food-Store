import { httpClient } from '@/shared/api/http-client'

import type {
  CustomerChangePasswordRequest,
  CustomerProfile,
  CustomerProfileUpdateRequest,
} from '@/entities/customer-profile/model/types'

export const customerProfileClient = {
  get: async () => {
    const response = await httpClient.get<CustomerProfile>('/api/v1/customer/profile')
    return response.data
  },
  update: async (payload: CustomerProfileUpdateRequest) => {
    const response = await httpClient.patch<CustomerProfile>('/api/v1/customer/profile', payload)
    return response.data
  },
  changePassword: async (payload: CustomerChangePasswordRequest) => {
    await httpClient.post('/api/v1/customer/profile/change-password', payload)
  },
}
