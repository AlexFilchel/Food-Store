import { useQuery } from '@tanstack/react-query'

import { publicCatalogClient } from '@/entities/public-catalog/api/public-catalog-client'
import type { PublicCatalogListFilters } from '@/entities/public-catalog/model/types'
import { publicCatalogQueryKeys } from '@/features/public-catalog/model/public-catalog-query-keys'

export const usePublicCatalogListQuery = (filters: PublicCatalogListFilters) =>
  useQuery({
    queryKey: publicCatalogQueryKeys.list(filters),
    queryFn: () => publicCatalogClient.list(filters),
  })

export const usePublicCatalogDetailQuery = (productIdOrSlug: string) =>
  useQuery({
    queryKey: publicCatalogQueryKeys.detail(productIdOrSlug),
    queryFn: () => publicCatalogClient.detail(productIdOrSlug),
    enabled: productIdOrSlug.trim().length > 0,
  })
