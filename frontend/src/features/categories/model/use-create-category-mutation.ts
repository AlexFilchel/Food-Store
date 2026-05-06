import { useMutation, useQueryClient } from '@tanstack/react-query'

import { categoryClient } from '@/entities/categories/api/category-client'
import { categoriesQueryKeys } from '@/features/categories/model/category-query-keys'

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: categoryClient.create,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.trees() }),
      ])
    },
  })
}
