import { Link, NavLink, Outlet } from 'react-router-dom'

import { getNavigationForRoles, routePaths } from '@/app/routes/route-config'
import { LogoutButton } from '@/features/auth/ui/logout-button'
import { cn } from '@/shared/lib/class-names'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useUiStore } from '@/shared/stores/ui-store'

export function AuthenticatedShellLayout() {
  const user = useAuthStore((state) => state.user)
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const navigation = getNavigationForRoles(user?.roles ?? [])
  const desktopSidebarExpanded = sidebarOpen

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Food Store</p>
            <h1 className="text-lg font-semibold">Shell protegido</h1>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              to={routePaths.home}
            >
              Catálogo
            </Link>
            <UserSummary />
            <LogoutButton className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" />
          </div>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={sidebarOpen}
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 md:hidden"
            onClick={toggleSidebar}
            type="button"
          >
            {sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          </button>
        </div>
      </header>

      <div
        className={cn(
          'mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8',
          desktopSidebarExpanded ? 'lg:grid-cols-[260px_minmax(0,1fr)]' : 'lg:grid-cols-[84px_minmax(0,1fr)]',
        )}
      >
        <aside className="hidden lg:block">
          <nav aria-label="Navegación principal" className="sticky top-24 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <button
              aria-label={desktopSidebarExpanded ? 'Contraer menú lateral' : 'Expandir menú lateral'}
              aria-pressed={desktopSidebarExpanded}
              className="mb-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              onClick={toggleSidebar}
              type="button"
            >
              <span aria-hidden="true" className="text-base leading-none">☰</span>
            </button>

            <NavigationList navigation={navigation} compact={!desktopSidebarExpanded} />
          </nav>
        </aside>

        {sidebarOpen ? (
          <div className="lg:hidden">
            <nav
              aria-label="Navegación móvil"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              id="mobile-navigation"
            >
              <UserSummary className="mb-4 flex md:hidden" />
              <NavigationList navigation={navigation} compact={false} />
              <LogoutButton className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" />
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
  compact: boolean
}

function NavigationList({ navigation, compact }: NavigationListProps) {
  return (
    <ul className="space-y-2">
      {navigation.map((item) => (
        <li key={item.to}>
          <NavLink
            aria-label={item.label}
            className={({ isActive }) =>
              cn(
                'block rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-sky-300',
                compact ? 'px-2 py-2.5' : 'px-4 py-3',
                isActive
                  ? 'border-sky-200 bg-sky-50 text-sky-900'
                  : 'border-slate-200/70 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white',
              )
            }
            end={item.exact}
            to={item.to}
          >
            <div className={cn('flex items-center', compact ? 'justify-center' : 'gap-3')}>
              <span className="inline-flex size-5 items-center justify-center" aria-hidden="true">
                <NavigationIcon to={item.to} />
              </span>
              {!compact ? <span className="block text-sm font-semibold">{item.label}</span> : null}
            </div>
            {!compact ? <span className="mt-1 block text-sm text-slate-500">{item.description}</span> : null}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function NavigationIcon({ to }: { to: string }) {
  const icon = (() => {
    switch (to) {
      case routePaths.app:
        return '🏠'
      case routePaths.admin:
        return '🧭'
      case routePaths.adminMetrics:
        return '📈'
      case routePaths.adminCategories:
        return '🗂️'
      case routePaths.adminIngredients:
        return '🥗'
      case routePaths.adminProducts:
        return '📦'
      case routePaths.adminUsers:
        return '👥'
      case routePaths.adminSystemConfiguration:
        return '⚙️'
      case routePaths.stock:
        return '🛒'
      case routePaths.adminOrders:
        return '📋'
      case routePaths.orders:
        return '🧾'
      default:
        return '•'
    }
  })()

  return <span className="text-base leading-none">{icon}</span>
}

function UserSummary({ className }: { className?: string }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return null
  }

  return (
    <div className={cn('items-center gap-3 rounded-lg bg-slate-100 px-4 py-2', className ?? 'flex')}>
      <div className="flex size-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
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
