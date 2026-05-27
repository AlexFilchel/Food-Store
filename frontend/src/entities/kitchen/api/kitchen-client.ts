import type { KitchenQueueResponse } from '@/entities/kitchen/model/types'
import { httpClient } from '@/shared/api/http-client'
import { appEnv } from '@/shared/config/env'

export const kitchenClient = {
  list: async () => {
    const response = await httpClient.get<KitchenQueueResponse>('/api/v1/cocina/pedidos')
    return response.data
  },
}

export function buildKitchenWebSocketUrl(token: string) {
  const baseUrl = appEnv.apiUrl.replace(/^http/i, 'ws').replace(/\/$/, '')
  return `${baseUrl}/api/v1/cocina/ws?token=${encodeURIComponent(token)}`
}
