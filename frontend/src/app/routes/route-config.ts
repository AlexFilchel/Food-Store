export const routePaths = {
  home: '/',
  catalogProductDetail: '/catalog/products/:productIdOrSlug',
  cart: '/cart',
  login: '/login',
  register: '/register',
  app: '/app',
  admin: '/admin',
  adminCategories: '/admin/categories',
  adminIngredients: '/admin/ingredients',
  adminProducts: '/admin/products',
  adminUsers: '/admin/users',
  adminUserDetail: '/admin/users/:userId',
  adminOrders: '/admin/orders',
  adminOrderDetail: '/admin/orders/:orderId',
  stock: '/stock',
  orders: '/orders',
  orderDetail: '/orders/:orderId',
  paymentResult: '/payment/result',
  accessDenied: '/access-denied',
} as const

export type AppRoleCode = 'ADMIN' | 'CLIENT' | 'PEDIDOS' | 'STOCK'

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
    to: routePaths.admin,
    label: 'Administración',
    description: 'Panel operativo para administración general.',
    allowedRoles: ['ADMIN'],
    exact: true,
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
    to: routePaths.stock,
    label: 'Stock',
    description: 'Gestión de inventario y disponibilidad.',
    allowedRoles: ['ADMIN', 'STOCK'],
    exact: true,
  },
  {
    to: routePaths.adminOrders,
    label: 'Pedidos',
    description: 'Gestión operativa de pedidos y seguimiento del flujo.',
    allowedRoles: ['ADMIN', 'PEDIDOS'],
    exact: true,
  },
  {
    to: routePaths.orders,
    label: 'Mis pedidos',
    description: 'Seguimiento de tus pedidos como cliente.',
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
    return routePaths.admin
  }

  if (userRoles.includes('STOCK')) {
    return routePaths.stock
  }

  if (userRoles.includes('PEDIDOS')) {
    return routePaths.adminOrders
  }

  return routePaths.app
}
