import axios from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

import { appEnv } from '@/shared/config/env'
import { emitShellEvent } from '@/shared/lib/http-events'
import { useAuthStore } from '@/shared/stores/auth-store'

export const httpClient = axios.create({
  baseURL: appEnv.apiUrl,
  timeout: 10_000,
})

const refreshClient = axios.create({
  baseURL: appEnv.apiUrl,
  timeout: 10_000,
})

interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
}

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/register',
])

function getRequestPath(config?: AxiosRequestConfig) {
  if (!config?.url) {
    return null
  }

  return config.url.startsWith('http') ? new URL(config.url).pathname : config.url
}

function isPublicAuthRequest(config?: AxiosRequestConfig) {
  const path = getRequestPath(config)
  return path ? PUBLIC_AUTH_ENDPOINTS.has(path) : false
}

function shouldSkipGlobalErrorFeedback(config?: AxiosRequestConfig) {
  const headerValue = config?.headers?.['x-skip-global-error-feedback']
  return headerValue === 'true'
}

function clearSessionAndNotify(message: string) {
  const authStore = useAuthStore.getState()
  authStore.clear()

  if (authStore.shouldSuppressSessionExpired()) {
    return
  }

  emitShellEvent({ type: 'session-expired', message })
}

httpClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken
  config.headers = config.headers ?? {}

  if (isPublicAuthRequest(config)) {
    delete config.headers.Authorization
    delete config.headers.authorization
    return config
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    const isPublicRequest = isPublicAuthRequest(originalRequest)
    const skipGlobalFeedback = shouldSkipGlobalErrorFeedback(originalRequest)

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isPublicRequest && !skipGlobalFeedback) {
      const authStore = useAuthStore.getState()
      const refreshToken = authStore.refreshToken

      if (authStore.shouldSuppressSessionExpired()) {
        authStore.clear()
        return Promise.reject(error)
      }

      if (!refreshToken) {
        clearSessionAndNotify('Tu sesión venció. Iniciá sesión de nuevo para continuar.')
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const response = await refreshClient.post<RefreshTokenResponse>('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        })

        authStore.updateTokens({
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        })

        const retriedConfig = error.config as InternalAxiosRequestConfig & RetriableRequestConfig
        retriedConfig.headers.Authorization = `Bearer ${response.data.access_token}`
        return httpClient(retriedConfig)
      } catch (refreshError) {
        if (authStore.shouldSuppressSessionExpired()) {
          authStore.clear()
          return Promise.reject(refreshError)
        }

        clearSessionAndNotify('Tu sesión venció. Iniciá sesión de nuevo para continuar.')
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401 && !isPublicRequest && !skipGlobalFeedback) {
      clearSessionAndNotify('Tu sesión venció. Iniciá sesión de nuevo para continuar.')
    }

    if (error.response?.status === 403 && !skipGlobalFeedback) {
      emitShellEvent({
        type: 'forbidden',
        message: 'No tenés permisos para acceder a esa sección.',
      })
    }

    if (
      !skipGlobalFeedback &&
      error.response?.status !== 401 &&
      error.response?.status !== 403 &&
      (!error.response || error.response.status >= 500)
    ) {
      emitShellEvent({
        type: 'api-error',
        message: 'Hubo un problema al comunicarse con el servidor. Probá de nuevo en unos instantes.',
      })
    }

    return Promise.reject(error)
  },
)
