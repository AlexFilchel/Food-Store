import { useMutation, useQueryClient } from '@tanstack/react-query'

import { categoryClient } from '@/entities/categories/api/category-client'
import { categoriesQueryKeys } from '@/features/categories/model/category-query-keys'

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: categoryClient.remove,
    onSuccess: async (_, categoryId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.trees() }),
        queryClient.removeQueries({ queryKey: categoriesQueryKeys.detail(categoryId) }),
      ])
    },
  })
}
