import { httpClient } from '@/shared/api/http-client'
import type { PaginatedResult, Product, ProductListFilters, ProductMutationPayload } from '@/entities/products/model/types'

export const productClient = {
  list: async (filters: ProductListFilters) => (await httpClient.get<PaginatedResult<Product>>('/api/v1/admin/products', { params: filters })).data,
  detail: async (productId: number) => (await httpClient.get<Product>(`/api/v1/admin/products/${productId}`)).data,
  create: async (payload: ProductMutationPayload) => (await httpClient.post<Product>('/api/v1/admin/products', payload)).data,
  update: async (productId: number, payload: Partial<ProductMutationPayload>) => (await httpClient.patch<Product>(`/api/v1/admin/products/${productId}`, payload)).data,
  remove: async (productId: number) => { await httpClient.delete(`/api/v1/admin/products/${productId}`) },
}
