import type { AuthUser } from '@/shared/stores/auth-store'

export type CustomerProfile = AuthUser

export interface CustomerProfileUpdateRequest {
  first_name: string
  last_name: string
  email: string
}

export interface CustomerChangePasswordRequest {
  current_password: string
  new_password: string
}
