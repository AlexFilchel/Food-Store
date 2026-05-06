import type { AllergenListFilters, IngredientListFilters } from '@/entities/ingredients/model/types'

export const ingredientQueryKeys = {
  all: ['ingredients'] as const,
  lists: () => [...ingredientQueryKeys.all, 'list'] as const,
  list: (filters: IngredientListFilters) => [...ingredientQueryKeys.lists(), filters] as const,
  details: () => [...ingredientQueryKeys.all, 'detail'] as const,
  detail: (ingredientId: number) => [...ingredientQueryKeys.details(), ingredientId] as const,
}

export const allergenQueryKeys = {
  all: ['allergens'] as const,
  lists: () => [...allergenQueryKeys.all, 'list'] as const,
  list: (filters: AllergenListFilters) => [...allergenQueryKeys.lists(), filters] as const,
  details: () => [...allergenQueryKeys.all, 'detail'] as const,
  detail: (allergenId: number) => [...allergenQueryKeys.details(), allergenId] as const,
}
