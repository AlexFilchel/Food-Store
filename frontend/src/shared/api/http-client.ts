import axios from 'axios'

import { appEnv } from '@/shared/config/env'
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

httpClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as { _retry?: boolean } | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const authStore = useAuthStore.getState()
      const refreshToken = authStore.refreshToken

      if (!refreshToken) {
        authStore.clear()
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

        error.config.headers.Authorization = `Bearer ${response.data.access_token}`
        return httpClient(error.config)
      } catch (refreshError) {
        authStore.clear()
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().clear()
    }

    return Promise.reject(error)
  },
)
