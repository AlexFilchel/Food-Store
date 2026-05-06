import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ingredientClient } from '@/entities/ingredients/api/ingredient-client'
import type {
  AllergenListFilters,
  AllergenMutationPayload,
  IngredientListFilters,
  IngredientMutationPayload,
} from '@/entities/ingredients/model/types'
import { allergenQueryKeys, ingredientQueryKeys } from '@/features/ingredients/model/ingredient-query-keys'

export function useIngredientsListQuery(filters: IngredientListFilters) {
  return useQuery({ queryKey: ingredientQueryKeys.list(filters), queryFn: () => ingredientClient.listIngredients(filters) })
}

export function useAllergensListQuery(filters: AllergenListFilters) {
  return useQuery({ queryKey: allergenQueryKeys.list(filters), queryFn: () => ingredientClient.listAllergens(filters) })
}

export function useCreateIngredientMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IngredientMutationPayload) => ingredientClient.createIngredient(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: allergenQueryKeys.lists() }),
      ])
    },
  })
}

export function useUpdateIngredientMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ingredientId, payload }: { ingredientId: number; payload: IngredientMutationPayload }) =>
      ingredientClient.updateIngredient(ingredientId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.detail(variables.ingredientId) }),
      ])
    },
  })
}

export function useDeleteIngredientMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ingredientClient.deleteIngredient,
    onSuccess: async (_, ingredientId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.lists() }),
        queryClient.removeQueries({ queryKey: ingredientQueryKeys.detail(ingredientId) }),
      ])
    },
  })
}

export function useCreateAllergenMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AllergenMutationPayload) => ingredientClient.createAllergen(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: allergenQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.lists() }),
      ])
    },
  })
}

export function useUpdateAllergenMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ allergenId, payload }: { allergenId: number; payload: AllergenMutationPayload }) =>
      ingredientClient.updateAllergen(allergenId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: allergenQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: allergenQueryKeys.detail(variables.allergenId) }),
        queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.lists() }),
      ])
    },
  })
}

export function useDeleteAllergenMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ingredientClient.deleteAllergen,
    onSuccess: async (_, allergenId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: allergenQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.lists() }),
        queryClient.removeQueries({ queryKey: allergenQueryKeys.detail(allergenId) }),
      ])
    },
  })
}
