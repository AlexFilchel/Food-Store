import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
  first_name: string
  last_name: string
  email: string
  roles: string[]
  created_at: string
}

interface AuthStore {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (payload: { accessToken: string; refreshToken: string; user: AuthUser }) => void
  updateTokens: (payload: { accessToken: string; refreshToken: string }) => void
  clear: () => void
  isAuthenticated: () => boolean
  hasRole: (role: string) => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      updateTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => Boolean(get().accessToken),
      hasRole: (role) => get().user?.roles.includes(role) ?? false,
    }),
    {
      name: 'food-store-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
