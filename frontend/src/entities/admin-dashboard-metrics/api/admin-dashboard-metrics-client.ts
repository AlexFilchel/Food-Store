import type { DashboardMetricsFilters, DashboardMetricsResponse } from '@/entities/admin-dashboard-metrics/model/types'
import { httpClient } from '@/shared/api/http-client'

export const adminDashboardMetricsClient = {
  getMetrics: async (filters: DashboardMetricsFilters = {}) => {
    const response = await httpClient.get<DashboardMetricsResponse>('/api/v1/admin/dashboard/metrics', {
      params: {
        from: filters.from,
        to: filters.to,
        granularity: filters.granularity,
        timezone: filters.timezone,
      },
    })
    return response.data
  },
}
