import type { PropsWithChildren } from 'react'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useFeedbackStore } from '@/shared/stores/feedback-store'
import { useAuthStore } from '@/shared/stores/auth-store'

const SESSION_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
const INACTIVITY_EXEMPT_PATHS = new Set([routePaths.kitchen])

export function SessionInactivityGuard({ children }: PropsWithChildren) {
  const location = useLocation()
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const clearSession = useAuthStore((state) => state.clear)
  const setError = useFeedbackStore((state) => state.setError)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const hasSession = Boolean(accessToken || refreshToken)
    const isExempt = INACTIVITY_EXEMPT_PATHS.has(location.pathname)

    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!hasSession || isExempt) {
      return
    }

    const expireSession = () => {
      clearSession()
      setError({
        title: 'Sesión cerrada por inactividad',
        message: 'Tu sesión se cerró por inactividad. Iniciá sesión otra vez para continuar.',
      })
      navigate(routePaths.login, {
        replace: true,
        state: { from: location, reason: 'idle' },
      })
    }

    const resetTimer = () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(expireSession, SESSION_INACTIVITY_TIMEOUT_MS)
    }

    resetTimer()

    const events: Array<keyof WindowEventMap> = ['keydown', 'mousemove', 'pointerdown', 'scroll', 'touchstart']
    for (const eventName of events) {
      window.addEventListener(eventName, resetTimer, { passive: true })
    }

    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current)
      }
      for (const eventName of events) {
        window.removeEventListener(eventName, resetTimer)
      }
    }
  }, [accessToken, clearSession, location, navigate, refreshToken, setError])

  return <>{children}</>
}
