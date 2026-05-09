import { httpClient } from '@/shared/api/http-client'
import type {
  PublicCatalogListFilters,
  PublicCatalogProduct,
  PublicPaginatedResult,
} from '@/entities/public-catalog/model/types'

export const publicCatalogClient = {
  list: async (filters: PublicCatalogListFilters) =>
    (await httpClient.get<PublicPaginatedResult<PublicCatalogProduct>>('/api/v1/catalog/products', { params: filters })).data,
  detail: async (productIdOrSlug: string) =>
    (await httpClient.get<PublicCatalogProduct>(`/api/v1/catalog/products/${productIdOrSlug}`)).data,
}
