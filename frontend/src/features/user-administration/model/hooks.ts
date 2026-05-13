import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { userAdminClient } from '@/entities/user-administration/api/user-admin-client'
import type {
  AdminUserCreatePayload,
  AdminUserLifecyclePayload,
  AdminUserListFilters,
  AdminUserPasswordResetPayload,
  AdminUserRoleUpdatePayload,
  AdminUserUpdatePayload,
} from '@/entities/user-administration/model/types'
import { userAdminQueryKeys } from '@/features/user-administration/model/user-admin-query-keys'

export function useAdminUsersListQuery(filters: AdminUserListFilters) {
  return useQuery({
    queryKey: userAdminQueryKeys.list(filters),
    queryFn: () => userAdminClient.list(filters),
  })
}

export function useAdminUserDetailQuery(userId: number) {
  return useQuery({
    queryKey: userAdminQueryKeys.detail(userId),
    queryFn: () => userAdminClient.detail(userId),
    enabled: userId > 0,
  })
}

export function useAdminUserCreateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminUserCreatePayload) => userAdminClient.create(payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.lists() }),
        queryClient.setQueryData(userAdminQueryKeys.detail(data.id), data),
      ])
    },
  })
}

export function useAdminUserUpdateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: AdminUserUpdatePayload }) =>
      userAdminClient.update(userId, payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.lists() }),
        queryClient.setQueryData(userAdminQueryKeys.detail(data.id), data),
      ])
    },
  })
}

export function useAdminUserRoleUpdateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: AdminUserRoleUpdatePayload }) =>
      userAdminClient.replaceRoles(userId, payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.detail(data.user_id) }),
      ])
    },
  })
}

export function useAdminUserLifecycleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: AdminUserLifecyclePayload }) =>
      userAdminClient.updateLifecycle(userId, payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.detail(data.user_id) }),
      ])
    },
  })
}

export function useAdminUserPasswordResetMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: AdminUserPasswordResetPayload }) =>
      userAdminClient.resetPassword(userId, payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userAdminQueryKeys.detail(data.user_id) }),
      ])
    },
  })
}
