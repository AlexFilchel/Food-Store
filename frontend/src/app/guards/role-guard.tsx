import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import type { AppRoleCode } from '@/app/routes/route-config'
import { hasRequiredRole, routePaths } from '@/app/routes/route-config'
import { useAuthStore } from '@/shared/stores/auth-store'

interface RoleGuardProps extends PropsWithChildren {
  allowedRoles: readonly AppRoleCode[]
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const userRoles = user?.roles ?? []

  if (!hasRequiredRole(userRoles, allowedRoles)) {
    return <Navigate replace state={{ from: location }} to={routePaths.accessDenied} />
  }

  return <>{children}</>
}
