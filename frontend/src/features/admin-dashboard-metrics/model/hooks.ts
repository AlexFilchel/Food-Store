import { useQuery } from '@tanstack/react-query'

import { adminDashboardMetricsClient } from '@/entities/admin-dashboard-metrics/api/admin-dashboard-metrics-client'
import type { DashboardMetricsFilters } from '@/entities/admin-dashboard-metrics/model/types'

export const adminDashboardMetricsQueryKeys = {
  all: ['admin-dashboard-metrics'] as const,
  detail: (filters: {
    from: string | null
    to: string | null
    granularity: string
    timezone: string
  }) => [...adminDashboardMetricsQueryKeys.all, filters] as const,
}

export function useAdminDashboardMetricsQuery(filters: DashboardMetricsFilters) {
  const normalizedFrom = filters.from?.trim() || null
  const normalizedTo = filters.to?.trim() || null
  const normalizedTimezone = filters.timezone?.trim() || 'America/Argentina/Buenos_Aires'

  const normalized = {
    from: normalizedFrom,
    to: normalizedTo,
    granularity: filters.granularity ?? 'day',
    timezone: normalizedTimezone,
  }

  return useQuery({
    queryKey: adminDashboardMetricsQueryKeys.detail(normalized),
    queryFn: () => adminDashboardMetricsClient.getMetrics(normalized),
  })
}
