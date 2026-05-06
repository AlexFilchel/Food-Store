import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { getNavigationForRoles } from '@/app/routes/route-config'
import { LogoutButton } from '@/features/auth/ui/logout-button'
import { cn } from '@/shared/lib/class-names'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useUiStore } from '@/shared/stores/ui-store'

export function AuthenticatedShellLayout() {
  const user = useAuthStore((state) => state.user)
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const navigation = getNavigationForRoles(user?.roles ?? [])
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Food Store</p>
            <h1 className="text-lg font-semibold">Shell protegido</h1>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <UserSummary />
            <LogoutButton className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" />
          </div>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={sidebarOpen}
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 md:hidden"
            onClick={toggleSidebar}
            type="button"
          >
            {sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <nav aria-label="Navegación principal" className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <NavigationList navigation={navigation} />
          </nav>
        </aside>

        {sidebarOpen ? (
          <div className="lg:hidden">
            <nav
              aria-label="Navegación móvil"
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              id="mobile-navigation"
            >
              <UserSummary className="mb-4 flex md:hidden" />
              <NavigationList navigation={navigation} />
              <LogoutButton className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" />
            </nav>
          </div>
        ) : null}

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

interface NavigationListProps {
  navigation: ReturnType<typeof getNavigationForRoles>
}

function NavigationList({ navigation }: NavigationListProps) {
  return (
    <ul className="space-y-2">
      {navigation.map((item) => (
        <li key={item.to}>
          <NavLink
            className={({ isActive }) =>
              cn(
                'block rounded-2xl border px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-sky-300',
                isActive
                  ? 'border-sky-200 bg-sky-50 text-sky-900'
                  : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white',
              )
            }
            end={item.exact}
            to={item.to}
          >
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className="mt-1 block text-sm text-slate-500">{item.description}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function UserSummary({ className }: { className?: string }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return null
  }

  return (
    <div className={cn('items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2', className ?? 'flex')}>
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {user.first_name[0]}
        {user.last_name[0]}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-xs text-slate-600">{user.roles.join(' · ')}</p>
      </div>
    </div>
  )
}
