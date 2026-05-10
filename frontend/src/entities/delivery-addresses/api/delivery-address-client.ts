import { httpClient } from '@/shared/api/http-client'

import type {
  DeliveryAddress,
  DeliveryAddressCreateRequest,
  DeliveryAddressUpdateRequest,
} from '@/entities/delivery-addresses/model/types'

export const deliveryAddressClient = {
  list: async () => {
    const response = await httpClient.get<DeliveryAddress[]>('/api/v1/customer/addresses')
    return response.data
  },
  detail: async (addressId: number) => {
    const response = await httpClient.get<DeliveryAddress>(`/api/v1/customer/addresses/${addressId}`)
    return response.data
  },
  create: async (payload: DeliveryAddressCreateRequest) => {
    const response = await httpClient.post<DeliveryAddress>('/api/v1/customer/addresses', payload)
    return response.data
  },
  update: async (addressId: number, payload: DeliveryAddressUpdateRequest) => {
    const response = await httpClient.patch<DeliveryAddress>(`/api/v1/customer/addresses/${addressId}`, payload)
    return response.data
  },
  remove: async (addressId: number) => {
    await httpClient.delete(`/api/v1/customer/addresses/${addressId}`)
  },
  setDefault: async (addressId: number) => {
    const response = await httpClient.put<DeliveryAddress>(`/api/v1/customer/addresses/${addressId}/default`, {
      is_default: true,
    })
    return response.data
  },
}
