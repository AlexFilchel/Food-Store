import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom'

import { AnonymousOnlyGuard } from '@/app/guards/anonymous-only-guard'
import { AuthenticatedGuard } from '@/app/guards/authenticated-guard'
import { RoleGuard } from '@/app/guards/role-guard'
import { ShellEventBridge } from '@/app/providers/shell-event-bridge'
import type { AppRoleCode } from '@/app/routes/route-config'
import { routePaths } from '@/app/routes/route-config'
import { SessionBootstrapBoundary } from '@/features/auth/ui/session-bootstrap-boundary'
import { AccessDeniedPage } from '@/pages/access-denied-page/ui/access-denied-page'
import { AdminCategoriesPage } from '@/pages/admin-categories-page/ui/admin-categories-page'
import { AdminIngredientsPage } from '@/pages/admin-ingredients-page/ui/admin-ingredients-page'
import { AdminPage } from '@/pages/admin-page/ui/admin-page'
import { AdminProductsPage } from '@/pages/admin-products-page/ui/admin-products-page'
import { AppPage } from '@/pages/app-page/ui/app-page'
import { CartPage } from '@/pages/cart-page/ui/cart-page'
import { HomePage } from '@/pages/home-page/ui/home-page'
import { LoginPage } from '@/pages/login-page/ui/login-page'
import { NotFoundPage } from '@/pages/not-found-page/ui/not-found-page'
import { OrdersPage } from '@/pages/orders-page/ui/orders-page'
import { OrderDetailPage } from '@/pages/order-detail-page/ui/order-detail-page'
import { PaymentResultPage } from '@/pages/payment-result-page/ui/payment-result-page'
import { PublicProductDetailPage } from '@/pages/public-product-detail-page/ui/public-product-detail-page'
import { RegisterPage } from '@/pages/register-page/ui/register-page'
import { StockPage } from '@/pages/stock-page/ui/stock-page'
import { GlobalFeedbackBanner } from '@/shared/ui/global-feedback-banner'
import { PublicStorefrontShell } from '@/shared/ui/public-storefront-shell'
import { AuthenticatedShellLayout } from '@/widgets/app-shell/ui/authenticated-shell-layout'

export function AppRouter() {
  return <RouterProvider router={createAppRouter()} />
}

interface CreateAppRouterOptions {
  initialEntries?: string[]
}

export function createAppRouter(options?: CreateAppRouterOptions) {
  const routes = createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route element={<ShellEventBridge />}>
        <Route element={<PublicStorefrontLayout />}>
          <Route index element={<HomePage />} />
          <Route path={routePaths.catalogProductDetail} element={<PublicProductDetailPage />} />
          <Route path={routePaths.cart} element={<CartPage />} />
        </Route>
        <Route
          element={
            <AnonymousOnlyGuard>
              <LoginPage />
            </AnonymousOnlyGuard>
          }
          path={routePaths.login}
        />
        <Route
          element={
            <AnonymousOnlyGuard>
              <RegisterPage />
            </AnonymousOnlyGuard>
          }
          path={routePaths.register}
        />
        <Route path={routePaths.accessDenied} element={<AccessDeniedPage />} />

        <Route
          element={
            <AuthenticatedGuard>
              <SessionBootstrapBoundary>
                <AuthenticatedShellLayout />
              </SessionBootstrapBoundary>
            </AuthenticatedGuard>
          }
        >
          <Route path={routePaths.app} element={<AppPage />} />
          <Route path={routePaths.admin} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminPage /></ProtectedByRole>} />
          <Route path={routePaths.adminCategories} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminCategoriesPage /></ProtectedByRole>} />
          <Route path={routePaths.adminIngredients} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminIngredientsPage /></ProtectedByRole>} />
          <Route path={routePaths.adminProducts} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminProductsPage /></ProtectedByRole>} />
          <Route path={routePaths.stock} element={<ProtectedByRole allowedRoles={['ADMIN', 'STOCK']}><StockPage /></ProtectedByRole>} />
          <Route path={routePaths.orders} element={<ProtectedByRole allowedRoles={['CLIENT']}><OrdersPage /></ProtectedByRole>} />
          <Route path={routePaths.orderDetail} element={<ProtectedByRole allowedRoles={['CLIENT']}><OrderDetailPage /></ProtectedByRole>} />
          <Route path={routePaths.paymentResult} element={<ProtectedByRole allowedRoles={['CLIENT']}><PaymentResultPage /></ProtectedByRole>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>,
  )

  if (options?.initialEntries) {
    return createMemoryRouter(routes, { initialEntries: options.initialEntries })
  }

  return createBrowserRouter(routes)
}

function ProtectedByRole({ allowedRoles, children }: { allowedRoles: readonly AppRoleCode[]; children: React.ReactNode }) {
  return <RoleGuard allowedRoles={allowedRoles}>{children}</RoleGuard>
}

function RootLayout() {
  return (
    <>
      <GlobalFeedbackBanner />
      <Outlet />
    </>
  )
}

function PublicStorefrontLayout() {
  return (
    <PublicStorefrontShell>
      <Outlet />
    </PublicStorefrontShell>
  )
}
