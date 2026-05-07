import type { ProductListFilters } from '@/entities/products/model/types'

export const productsQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productsQueryKeys.all, 'list'] as const,
  list: (filters: ProductListFilters) => [...productsQueryKeys.lists(), filters] as const,
  details: () => [...productsQueryKeys.all, 'detail'] as const,
  detail: (productId: number) => [...productsQueryKeys.details(), productId] as const,
}
