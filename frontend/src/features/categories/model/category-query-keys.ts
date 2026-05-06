import type { CategoryListFilters } from '@/entities/categories/model/types'

export const categoriesQueryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoriesQueryKeys.all, 'list'] as const,
  list: (filters: CategoryListFilters) => [...categoriesQueryKeys.lists(), filters] as const,
  trees: () => [...categoriesQueryKeys.all, 'tree'] as const,
  tree: (includeInactive: boolean) => [...categoriesQueryKeys.trees(), { includeInactive }] as const,
  details: () => [...categoriesQueryKeys.all, 'detail'] as const,
  detail: (categoryId: number) => [...categoriesQueryKeys.details(), categoryId] as const,
}
