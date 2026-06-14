export const routePaths = {
  home: '/',
  catalogProductDetail: '/catalog/products/:productIdOrSlug',
  cart: '/cart',
  login: '/login',
  register: '/register',
  app: '/app',
  admin: '/admin',
  adminMetrics: '/admin/metrics',
  adminCategories: '/admin/categories',
  adminIngredients: '/admin/ingredients',
  adminProducts: '/admin/products',
  adminUsers: '/admin/users',
  adminSystemConfiguration: '/admin/system/configuration',
  adminUserDetail: '/admin/users/:userId',
  adminOrders: '/admin/orders',
  adminOrderDetail: '/admin/orders/:orderId',
  kitchen: '/cocina',
  orders: '/orders',
  orderDetail: '/orders/:orderId',
  paymentResult: '/payment/result',
  profile: '/perfil',
  deliveryAddresses: '/mis-direcciones',
  accessDenied: '/access-denied',
} as const

export type AppRoleCode = 'ADMIN' | 'CLIENT' | 'COCINA' | 'PEDIDOS' | 'STOCK'

export interface NavigationRoute {
  allowedRoles: readonly AppRoleCode[]
  description: string
  exact?: boolean
  label: string
  to: string
}

export const navigationRoutes: readonly NavigationRoute[] = [
  {
    to: routePaths.app,
    label: 'Mi espacio',
    description: 'Resumen del cliente y próximos pasos.',
    allowedRoles: ['CLIENT', 'ADMIN'],
    exact: true,
  },
  {
    to: routePaths.adminMetrics,
    label: 'Métricas',
    description: 'Dashboard de métricas administrativas del negocio.',
    allowedRoles: ['ADMIN'],
  },
  {
    to: routePaths.adminCategories,
    label: 'Categorías',
    description: 'CRUD jerárquico del catálogo administrativo.',
    allowedRoles: ['ADMIN'],
  },
  {
    to: routePaths.adminIngredients,
    label: 'Ingredientes',
    description: 'Administración de ingredientes y alérgenos.',
    allowedRoles: ['ADMIN'],
  },
  {
    to: routePaths.adminProducts,
    label: 'Productos',
    description: 'Administración de productos y composición.',
    allowedRoles: ['ADMIN'],
  },
  {
    to: routePaths.adminUsers,
    label: 'Usuarios',
    description: 'Administración de usuarios y roles.',
    allowedRoles: ['ADMIN'],
  },
  {
    to: routePaths.adminSystemConfiguration,
    label: 'Configuración',
    description: 'Parámetros operativos globales del sistema.',
    allowedRoles: ['ADMIN'],
  },
  {
    to: routePaths.adminOrders,
    label: 'Pedidos',
    description: 'Gestión operativa de pedidos y seguimiento del flujo.',
    allowedRoles: ['ADMIN', 'PEDIDOS'],
    exact: true,
  },
  {
    to: routePaths.kitchen,
    label: 'Cocina',
    description: 'Pantalla operativa de pedidos para producción.',
    allowedRoles: ['ADMIN', 'PEDIDOS', 'COCINA'],
    exact: true,
  },
  {
    to: routePaths.orders,
    label: 'Mis pedidos',
    description: 'Seguimiento de tus pedidos como cliente.',
    allowedRoles: ['CLIENT'],
    exact: true,
  },
  {
    to: routePaths.profile,
    label: 'Mi perfil',
    description: 'Editá tu información personal y contraseña.',
    allowedRoles: ['CLIENT'],
    exact: true,
  },
  {
    to: routePaths.deliveryAddresses,
    label: 'Mis direcciones',
    description: 'Gestioná tus direcciones de entrega.',
    allowedRoles: ['CLIENT'],
    exact: true,
  },
] as const

export function hasRequiredRole(userRoles: readonly string[], allowedRoles: readonly AppRoleCode[]) {
  const roleSet = new Set(userRoles)
  return allowedRoles.some((role) => roleSet.has(role))
}

export function getNavigationForRoles(userRoles: readonly string[]) {
  return navigationRoutes.filter((route) => hasRequiredRole(userRoles, route.allowedRoles))
}

export function getDefaultAuthenticatedPath(userRoles: readonly string[]) {
  if (userRoles.includes('ADMIN')) {
    return routePaths.adminMetrics
  }

  if (userRoles.includes('PEDIDOS')) {
    return routePaths.adminOrders
  }

  const hasKitchenRole = userRoles.includes('COCINA')
  const hasOtherOperationalRole = userRoles.some((role) => role === 'ADMIN' || role === 'PEDIDOS' || role === 'STOCK')
  if (hasKitchenRole && !hasOtherOperationalRole) {
    return routePaths.kitchen
  }

  return routePaths.app
}
