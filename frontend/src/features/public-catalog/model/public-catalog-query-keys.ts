import type { PublicCatalogListFilters } from '@/entities/public-catalog/model/types'

export const publicCatalogQueryKeys = {
  all: ['public-catalog'] as const,
  lists: () => [...publicCatalogQueryKeys.all, 'list'] as const,
  list: (filters: PublicCatalogListFilters) => [...publicCatalogQueryKeys.lists(), filters] as const,
  details: () => [...publicCatalogQueryKeys.all, 'detail'] as const,
  detail: (productIdOrSlug: string) => [...publicCatalogQueryKeys.details(), productIdOrSlug] as const,
}
