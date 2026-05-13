export type UserRoleCode = 'ADMIN' | 'STOCK' | 'PEDIDOS' | 'CLIENT'

export interface AdminUserSummary {
  id: number
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  roles: UserRoleCode[]
  created_at: string
  updated_at: string
}

export interface AdminUserDetail {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  is_active: boolean
  roles: UserRoleCode[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AdminUserListFilters {
  page: number
  size: number
  search?: string
  role?: UserRoleCode
  is_active?: boolean
}

export interface AdminUserCreatePayload {
  first_name: string
  last_name: string
  email: string
  password: string
  role_codes: UserRoleCode[]
  is_active?: boolean
}

export interface AdminUserUpdatePayload {
  first_name?: string
  last_name?: string
  email?: string
}

export interface AdminUserRoleUpdatePayload {
  role_codes: UserRoleCode[]
}

export interface AdminUserLifecyclePayload {
  is_active: boolean
}

export interface AdminUserPasswordResetPayload {
  new_password: string
}

export interface AdminUserRoleUpdateResponse {
  user_id: number
  roles: UserRoleCode[]
}

export interface AdminUserLifecycleResponse {
  user_id: number
  is_active: boolean
}

export interface AdminUserPasswordResetResponse {
  user_id: number
  reset_at: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
