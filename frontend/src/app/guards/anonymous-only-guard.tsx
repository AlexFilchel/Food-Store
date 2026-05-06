import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'

import { getDefaultAuthenticatedPath } from '@/app/routes/route-config'
import { useAuthStore } from '@/shared/stores/auth-store'

export function AnonymousOnlyGuard({ children }: PropsWithChildren) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)

  if (accessToken && user) {
    return <Navigate replace to={getDefaultAuthenticatedPath(user.roles)} />
  }

  return <>{children}</>
}
