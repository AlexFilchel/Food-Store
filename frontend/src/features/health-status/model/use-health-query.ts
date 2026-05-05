import { useQuery } from '@tanstack/react-query'

import { getHealth } from '@/entities/health/api/get-health'

export const healthQueryKey = ['system', 'health'] as const

export function useHealthQuery() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: getHealth,
    staleTime: 30_000,
    retry: false,
  })
}
