import { httpClient } from '@/shared/api/http-client'
import type { HealthResponse } from '@/entities/health/model/types'

export async function getHealth(): Promise<HealthResponse> {
  const response = await httpClient.get<HealthResponse>('/api/v1/health')
  return response.data
}
