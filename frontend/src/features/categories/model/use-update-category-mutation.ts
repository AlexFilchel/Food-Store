import { useMutation, useQueryClient } from '@tanstack/react-query'

import { categoryClient } from '@/entities/categories/api/category-client'
import type { CategoryMutationPayload } from '@/entities/categories/model/types'
import { categoriesQueryKeys } from '@/features/categories/model/category-query-keys'

interface UpdateCategoryMutationArgs {
  categoryId: number
  payload: CategoryMutationPayload
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ categoryId, payload }: UpdateCategoryMutationArgs) => categoryClient.update(categoryId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.trees() }),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.detail(variables.categoryId) }),
      ])
    },
  })
}
