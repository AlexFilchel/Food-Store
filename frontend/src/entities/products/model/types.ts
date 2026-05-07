export interface ProductCategoryRef { id: number; name: string; slug: string }
export interface ProductIngredientRef { ingredient_id: number; name: string; slug: string; is_removable: boolean }

export interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  price: string
  stock_quantity: number
  is_active: boolean
  is_available: boolean
  created_at: string
  updated_at: string
  categories: ProductCategoryRef[]
  ingredients: ProductIngredientRef[]
}

export interface ProductListFilters {
  page: number
  size: number
  search?: string
  category_id?: number
  ingredient_id?: number
  include_inactive?: boolean
  availability?: boolean
  stock_state?: 'in_stock' | 'out_of_stock'
}

export interface ProductIngredientCompositionPayload { ingredient_id: number; is_removable: boolean }

export interface ProductMutationPayload {
  name: string
  description?: string | null
  price: string
  stock_quantity: number
  is_active: boolean
  is_available: boolean
  category_ids: number[]
  ingredients: ProductIngredientCompositionPayload[]
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
