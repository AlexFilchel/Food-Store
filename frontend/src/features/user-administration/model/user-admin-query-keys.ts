import type { AdminUserListFilters } from '@/entities/user-administration/model/types'

export const userAdminQueryKeys = {
  all: ['admin-users'] as const,
  lists: () => [...userAdminQueryKeys.all, 'list'] as const,
  list: (filters: AdminUserListFilters) => [...userAdminQueryKeys.lists(), filters] as const,
  detail: (userId: number) => [...userAdminQueryKeys.all, 'detail', userId] as const,
}
