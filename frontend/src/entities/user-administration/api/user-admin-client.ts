import { httpClient } from '@/shared/api/http-client'
import type {
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserLifecyclePayload,
  AdminUserLifecycleResponse,
  AdminUserListFilters,
  AdminUserPasswordResetPayload,
  AdminUserPasswordResetResponse,
  AdminUserRoleUpdatePayload,
  AdminUserRoleUpdateResponse,
  AdminUserSummary,
  AdminUserUpdatePayload,
  PaginatedResult,
} from '@/entities/user-administration/model/types'

export const userAdminClient = {
  list: async (filters: AdminUserListFilters) =>
    (await httpClient.get<PaginatedResult<AdminUserSummary>>('/api/v1/admin/users', { params: filters })).data,
  detail: async (userId: number) => (await httpClient.get<AdminUserDetail>(`/api/v1/admin/users/${userId}`)).data,
  create: async (payload: AdminUserCreatePayload) =>
    (await httpClient.post<AdminUserDetail>('/api/v1/admin/users', payload)).data,
  update: async (userId: number, payload: AdminUserUpdatePayload) =>
    (await httpClient.patch<AdminUserDetail>(`/api/v1/admin/users/${userId}`, payload)).data,
  replaceRoles: async (userId: number, payload: AdminUserRoleUpdatePayload) =>
    (await httpClient.put<AdminUserRoleUpdateResponse>(`/api/v1/admin/users/${userId}/roles`, payload)).data,
  updateLifecycle: async (userId: number, payload: AdminUserLifecyclePayload) =>
    (await httpClient.put<AdminUserLifecycleResponse>(`/api/v1/admin/users/${userId}/lifecycle`, payload)).data,
  resetPassword: async (userId: number, payload: AdminUserPasswordResetPayload) =>
    (await httpClient.post<AdminUserPasswordResetResponse>(`/api/v1/admin/users/${userId}/password-reset`, payload)).data,
}
