import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { getDefaultAuthenticatedPath, routePaths } from '@/app/routes/route-config'
import { useAuthMeQuery } from '@/features/auth/model/use-auth-me-query'
import { getErrorMessage, isAuthProblem } from '@/shared/api/problem-details'
import { useFeedbackStore } from '@/shared/stores/feedback-store'
import { useAuthStore } from '@/shared/stores/auth-store'

export function SessionBootstrapBoundary({ children }: PropsWithChildren) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clearSession = useAuthStore((state) => state.clear)
  const setError = useFeedbackStore((state) => state.setError)
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const hasPersistedSession = Boolean(accessToken || refreshToken)
  const query = useAuthMeQuery(hasPersistedSession)

  useEffect(() => {
    if (query.data) {
      setUser(query.data)
    }
  }, [query.data, setUser])

  useEffect(() => {
    if (!query.data) {
      return
    }

    if (location.pathname !== routePaths.app) {
      return
    }

    const destination = getDefaultAuthenticatedPath(query.data.roles)
    if (destination !== routePaths.app) {
      navigate(destination, { replace: true })
    }
  }, [location.pathname, navigate, query.data])

  useEffect(() => {
    if (!query.error || isAuthProblem(query.error)) {
      return
    }

    setError({
      title: 'No pudimos restaurar tu sesión',
      message: getErrorMessage(query.error, 'Hubo un problema al validar tu sesión actual.'),
    })
  }, [query.error, setError])

  useEffect(() => {
    if (!query.error || !isAuthProblem(query.error)) {
      return
    }

    clearSession()
  }, [clearSession, query.error])

  if (!hasPersistedSession) {
    return <Navigate replace state={{ from: location }} to={routePaths.login} />
  }

  if (query.isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-900">Validando sesión...</p>
          <p className="mt-2 text-sm text-slate-600">Estamos chequeando tus permisos actuales antes de mostrar contenido protegido.</p>
        </div>
      </div>
    )
  }

  if (query.error && isAuthProblem(query.error)) {
    return <Navigate replace state={{ from: location, reason: 'expired' }} to={routePaths.login} />
  }

  if (query.error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="max-w-lg rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center text-slate-900 shadow-sm">
          <h2 className="text-xl font-semibold">No pudimos validar tu sesión</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            La app sigue estable, pero necesitamos confirmar tu usuario antes de mostrar secciones protegidas.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => void query.refetch()}
              type="button"
            >
              Reintentar
            </button>
            <Link className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" to={routePaths.home}>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (query.data && !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-900">Preparando tu sesión...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
