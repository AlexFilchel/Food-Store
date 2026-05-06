import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useAuthStore } from '@/shared/stores/auth-store'

export function AuthenticatedGuard({ children }: PropsWithChildren) {
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)

  if (!accessToken && !refreshToken) {
    return <Navigate replace state={{ from: location }} to={routePaths.login} />
  }

  return <>{children}</>
}
