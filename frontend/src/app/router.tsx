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
import { SessionInactivityGuard } from '@/app/providers/session-inactivity-guard'
import type { AppRoleCode } from '@/app/routes/route-config'
import { routePaths } from '@/app/routes/route-config'
import { SessionBootstrapBoundary } from '@/features/auth/ui/session-bootstrap-boundary'
import { AccessDeniedPage } from '@/pages/access-denied-page/ui/access-denied-page'
import { AdminCategoriesPage } from '@/pages/admin-categories-page/ui/admin-categories-page'
import { AdminIngredientsPage } from '@/pages/admin-ingredients-page/ui/admin-ingredients-page'
import { AdminDashboardMetricsPage } from '@/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page'
import { AdminProductsPage } from '@/pages/admin-products-page/ui/admin-products-page'
import { AdminUsersPage } from '@/pages/admin-users-page/ui/admin-users-page'
import { AdminSystemConfigurationPage } from '@/pages/admin-system-configuration-page/ui/admin-system-configuration-page'
import { AdminUserDetailPage } from '@/pages/admin-user-detail-page/ui/admin-user-detail-page'
import { AppPage } from '@/pages/app-page/ui/app-page'
import { CartPage } from '@/pages/cart-page/ui/cart-page'
import { HomePage } from '@/pages/home-page/ui/home-page'
import { KitchenPage } from '@/pages/kitchen-page/ui/kitchen-page'
import { LoginPage } from '@/pages/login-page/ui/login-page'
import { NotFoundPage } from '@/pages/not-found-page/ui/not-found-page'
import { OrdersPage } from '@/pages/orders-page/ui/orders-page'
import { OrderDetailPage } from '@/pages/order-detail-page/ui/order-detail-page'
import { AdminOrdersPage } from '@/pages/admin-orders-page/ui/admin-orders-page'
import { AdminOrderDetailPage } from '@/pages/admin-order-detail-page/ui/admin-order-detail-page'
import { PaymentResultPage } from '@/pages/payment-result-page/ui/payment-result-page'
import { PublicProductDetailPage } from '@/pages/public-product-detail-page/ui/public-product-detail-page'
import { RegisterPage } from '@/pages/register-page/ui/register-page'
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
                <SessionInactivityGuard>
                  <AuthenticatedShellLayout />
                </SessionInactivityGuard>
              </SessionBootstrapBoundary>
            </AuthenticatedGuard>
          }
        >
          <Route path={routePaths.app} element={<AppPage />} />
          <Route path={routePaths.adminMetrics} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminDashboardMetricsPage /></ProtectedByRole>} />
          <Route path={routePaths.adminCategories} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminCategoriesPage /></ProtectedByRole>} />
          <Route path={routePaths.adminIngredients} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminIngredientsPage /></ProtectedByRole>} />
          <Route path={routePaths.adminProducts} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminProductsPage /></ProtectedByRole>} />
          <Route path={routePaths.adminUsers} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminUsersPage /></ProtectedByRole>} />
          <Route path={routePaths.adminSystemConfiguration} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminSystemConfigurationPage /></ProtectedByRole>} />
          <Route path={routePaths.adminUserDetail} element={<ProtectedByRole allowedRoles={['ADMIN']}><AdminUserDetailPage /></ProtectedByRole>} />
          <Route path={routePaths.orders} element={<ProtectedByRole allowedRoles={['CLIENT']}><OrdersPage /></ProtectedByRole>} />
          <Route path={routePaths.orderDetail} element={<ProtectedByRole allowedRoles={['CLIENT']}><OrderDetailPage /></ProtectedByRole>} />
          <Route path={routePaths.adminOrders} element={<ProtectedByRole allowedRoles={['ADMIN', 'PEDIDOS']}><AdminOrdersPage /></ProtectedByRole>} />
          <Route path={routePaths.adminOrderDetail} element={<ProtectedByRole allowedRoles={['ADMIN', 'PEDIDOS']}><AdminOrderDetailPage /></ProtectedByRole>} />
          <Route path={routePaths.kitchen} element={<ProtectedByRole allowedRoles={['ADMIN', 'PEDIDOS', 'COCINA']}><KitchenPage /></ProtectedByRole>} />
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
