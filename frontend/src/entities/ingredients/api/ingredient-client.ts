import { httpClient } from '@/shared/api/http-client'

import type {
  Allergen,
  AllergenListFilters,
  AllergenMutationPayload,
  AllergenPaginated,
  Ingredient,
  IngredientListFilters,
  IngredientMutationPayload,
  IngredientPaginated,
} from '@/entities/ingredients/model/types'

export const ingredientClient = {
  listIngredients: async (filters: IngredientListFilters) => {
    const response = await httpClient.get<IngredientPaginated>('/api/v1/admin/ingredients', { params: filters })
    return response.data
  },
  getIngredient: async (ingredientId: number) => {
    const response = await httpClient.get<Ingredient>(`/api/v1/admin/ingredients/${ingredientId}`)
    return response.data
  },
  createIngredient: async (payload: IngredientMutationPayload) => {
    const response = await httpClient.post<Ingredient>('/api/v1/admin/ingredients', payload)
    return response.data
  },
  updateIngredient: async (ingredientId: number, payload: IngredientMutationPayload) => {
    const response = await httpClient.patch<Ingredient>(`/api/v1/admin/ingredients/${ingredientId}`, payload)
    return response.data
  },
  deleteIngredient: async (ingredientId: number) => {
    await httpClient.delete(`/api/v1/admin/ingredients/${ingredientId}`)
  },
  listAllergens: async (filters: AllergenListFilters) => {
    const response = await httpClient.get<AllergenPaginated>('/api/v1/admin/allergens', { params: filters })
    return response.data
  },
  getAllergen: async (allergenId: number) => {
    const response = await httpClient.get<Allergen>(`/api/v1/admin/allergens/${allergenId}`)
    return response.data
  },
  createAllergen: async (payload: AllergenMutationPayload) => {
    const response = await httpClient.post<Allergen>('/api/v1/admin/allergens', payload)
    return response.data
  },
  updateAllergen: async (allergenId: number, payload: AllergenMutationPayload) => {
    const response = await httpClient.patch<Allergen>(`/api/v1/admin/allergens/${allergenId}`, payload)
    return response.data
  },
  deleteAllergen: async (allergenId: number) => {
    await httpClient.delete(`/api/v1/admin/allergens/${allergenId}`)
  },
}
