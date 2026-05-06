import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { subscribeToShellEvents } from '@/shared/lib/http-events'
import { useFeedbackStore } from '@/shared/stores/feedback-store'

export function ShellEventBridge() {
  const location = useLocation()
  const navigate = useNavigate()
  const setError = useFeedbackStore((state) => state.setError)

  useEffect(() => {
    return subscribeToShellEvents((event) => {
      if (event.type === 'session-expired') {
        setError({
          title: 'Sesión expirada',
          message: event.message,
        })

        navigate(routePaths.login, {
          replace: true,
          state: { from: location, reason: 'expired' },
        })
        return
      }

      if (event.type === 'forbidden') {
        setError({
          title: 'Acceso denegado',
          message: event.message,
        })

        navigate(routePaths.accessDenied, {
          replace: true,
          state: { from: location },
        })
        return
      }

      setError({
        title: 'Error del servidor',
        message: event.message,
      })
    })
  }, [location, navigate, setError])

  return <Outlet />
}
