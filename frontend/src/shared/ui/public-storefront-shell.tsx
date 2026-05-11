import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useCartStore } from '@/shared/stores/cart-store'

const baseLinkClassName = 'rounded-full px-3 py-2 text-sm font-medium transition hover:bg-slate-100'

export function PublicStorefrontShell({ children }: PropsWithChildren) {
  const totalItems = useCartStore((state) => state.totalItems())
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Food Store</p>
            <p className="text-sm text-slate-600">Armá tu pedido antes del checkout.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Navegación pública" className="flex flex-wrap gap-2">
              <NavLink
                className={({ isActive }) => `${baseLinkClassName} ${isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-700'}`}
                end
                to={routePaths.home}
              >
                Catálogo
              </NavLink>
              <NavLink
                className={({ isActive }) => `${baseLinkClassName} ${isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-700'}`}
                to={routePaths.cart}
              >
                Carrito{totalItems > 0 ? ` (${totalItems})` : ''}
              </NavLink>
            </nav>

            <NavLink
              className={({ isActive }) => `${baseLinkClassName} border border-slate-300 ${isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-700'}`}
              to={isAuthenticated ? routePaths.app : routePaths.login}
            >
              {isAuthenticated ? 'Mi Cuenta' : 'Login'}
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  )
}
