import { useQuery } from '@tanstack/react-query'

import { categoryClient } from '@/entities/categories/api/category-client'
import { categoriesQueryKeys } from '@/features/categories/model/category-query-keys'

export function useCategoriesTreeQuery(includeInactive: boolean) {
  return useQuery({
    queryKey: categoriesQueryKeys.tree(includeInactive),
    queryFn: () => categoryClient.tree(includeInactive),
  })
}
