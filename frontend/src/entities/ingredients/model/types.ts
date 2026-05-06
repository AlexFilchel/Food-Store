import type { PaginatedResult } from '@/entities/categories/model/types'

export interface Allergen {
  id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Ingredient {
  id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  allergens: Array<Pick<Allergen, 'id' | 'name' | 'slug'>>
}

export interface IngredientListFilters {
  page: number
  size: number
  search?: string
  include_inactive?: boolean
  allergen_id?: number
}

export interface AllergenListFilters {
  page: number
  size: number
  search?: string
  include_inactive?: boolean
}

export interface IngredientMutationPayload {
  name: string
  description: string | null
  is_active: boolean
  allergen_ids?: number[]
}

export interface AllergenMutationPayload {
  name: string
  description: string | null
  is_active: boolean
}

export type IngredientPaginated = PaginatedResult<Ingredient>
export type AllergenPaginated = PaginatedResult<Allergen>
