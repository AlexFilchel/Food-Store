export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  parent_id: number | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface CategoryListFilters {
  page: number
  size: number
  include_inactive?: boolean
  parent_id?: number
}

export interface CategoryMutationPayload {
  name: string
  description: string | null
  parent_id: number | null
  sort_order: number
  is_active: boolean
}
