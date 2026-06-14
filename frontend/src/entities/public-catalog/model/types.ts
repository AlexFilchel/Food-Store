export interface PublicCatalogCategoryRef {
  id: number
  name: string
  slug: string
}

export interface PublicCatalogIngredientRef {
  ingredient_id: number
  name: string
  slug: string
  is_removable: boolean
}

export interface PublicCatalogProduct {
  id: number
  name: string
  slug: string
  description: string | null
  price: string
  image_url: string | null
  categories: PublicCatalogCategoryRef[]
  ingredients: PublicCatalogIngredientRef[]
}

export interface PublicCatalogListFilters {
  page: number
  size: number
  search?: string
  category_id?: number
}

export interface PublicPaginatedResult<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
