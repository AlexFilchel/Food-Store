import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface UiStore {
  theme: Theme
  sidebarOpen: boolean
  setTheme: (theme: Theme) => void
  setSidebarOpen: (value: boolean) => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
        theme: 'light',
        sidebarOpen: false,
        setTheme: (theme) => set({ theme }),
        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      }),
    {
      name: 'food-store-ui',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)
