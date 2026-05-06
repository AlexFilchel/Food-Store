import axios from 'axios'

import { httpClient } from '@/shared/api/http-client'
import { appEnv } from '@/shared/config/env'
import type { AuthUser } from '@/shared/stores/auth-store'

const publicAuthClient = axios.create({
  baseURL: appEnv.apiUrl,
  timeout: 10_000,
})

export interface AuthRegisterRequest {
  first_name: string
  last_name: string
  email: string
  password: string
}

export interface AuthLoginRequest {
  email: string
  password: string
}

export interface AuthRefreshRequest {
  refresh_token: string
}

export interface AuthLogoutRequest {
  refresh_token: string
}

export interface AuthTokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
  user: AuthUser
}

export const authClient = {
  register: async (payload: AuthRegisterRequest) => {
    const response = await publicAuthClient.post<AuthTokenResponse>('/api/v1/auth/register', payload)
    return response.data
  },
  login: async (payload: AuthLoginRequest) => {
    const response = await publicAuthClient.post<AuthTokenResponse>('/api/v1/auth/login', payload)
    return response.data
  },
  refresh: async (payload: AuthRefreshRequest) => {
    const response = await publicAuthClient.post<AuthTokenResponse>('/api/v1/auth/refresh', payload)
    return response.data
  },
  logout: async (payload: AuthLogoutRequest) => {
    await httpClient.post('/api/v1/auth/logout', payload, {
      headers: { 'x-skip-global-error-feedback': 'true' },
    })
  },
  me: async () => {
    const response = await httpClient.get<AuthUser>('/api/v1/auth/me')
    return response.data
  },
}
