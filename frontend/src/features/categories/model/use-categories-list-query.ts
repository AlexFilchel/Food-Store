import { useQuery } from '@tanstack/react-query'

import { categoryClient } from '@/entities/categories/api/category-client'
import type { CategoryListFilters } from '@/entities/categories/model/types'
import { categoriesQueryKeys } from '@/features/categories/model/category-query-keys'

export function useCategoriesListQuery(filters: CategoryListFilters) {
  return useQuery({
    queryKey: categoriesQueryKeys.list(filters),
    queryFn: () => categoryClient.list(filters),
  })
}
