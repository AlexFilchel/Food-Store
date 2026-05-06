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
  suppressSessionExpiredUntil: number
  setSession: (payload: { accessToken: string; refreshToken: string; user: AuthUser }) => void
  setUser: (user: AuthUser | null) => void
  updateTokens: (payload: { accessToken: string; refreshToken: string }) => void
  suppressSessionExpiredFor: (milliseconds: number) => void
  shouldSuppressSessionExpired: () => boolean
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
      suppressSessionExpiredUntil: 0,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user, suppressSessionExpiredUntil: 0 }),
      setUser: (user) => set({ user }),
      updateTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      suppressSessionExpiredFor: (milliseconds) => set({ suppressSessionExpiredUntil: Date.now() + milliseconds }),
      shouldSuppressSessionExpired: () => Date.now() < get().suppressSessionExpiredUntil,
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => Boolean(get().accessToken || get().refreshToken),
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
