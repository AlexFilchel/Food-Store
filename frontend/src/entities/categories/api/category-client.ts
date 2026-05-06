import { httpClient } from '@/shared/api/http-client'

import type { Category, CategoryListFilters, CategoryMutationPayload, CategoryTreeNode, PaginatedResult } from '@/entities/categories/model/types'

export const categoryClient = {
  list: async (filters: CategoryListFilters) => {
    const response = await httpClient.get<PaginatedResult<Category>>('/api/v1/admin/categories', {
      params: filters,
    })
    return response.data
  },
  tree: async (includeInactive: boolean) => {
    const response = await httpClient.get<CategoryTreeNode[]>('/api/v1/admin/categories/tree', {
      params: { include_inactive: includeInactive },
    })
    return response.data
  },
  detail: async (categoryId: number) => {
    const response = await httpClient.get<Category>(`/api/v1/admin/categories/${categoryId}`)
    return response.data
  },
  create: async (payload: CategoryMutationPayload) => {
    const response = await httpClient.post<Category>('/api/v1/admin/categories', payload)
    return response.data
  },
  update: async (categoryId: number, payload: CategoryMutationPayload) => {
    const response = await httpClient.patch<Category>(`/api/v1/admin/categories/${categoryId}`, payload)
    return response.data
  },
  remove: async (categoryId: number) => {
    await httpClient.delete(`/api/v1/admin/categories/${categoryId}`)
  },
}
