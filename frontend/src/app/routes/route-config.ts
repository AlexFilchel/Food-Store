export const routePaths = {
  home: '/',
  login: '/login',
  register: '/register',
  app: '/app',
  admin: '/admin',
  stock: '/stock',
  orders: '/orders',
  accessDenied: '/access-denied',
} as const

export type AppRoleCode = 'ADMIN' | 'CLIENT' | 'PEDIDOS' | 'STOCK'

export interface NavigationRoute {
  allowedRoles: readonly AppRoleCode[]
  description: string
  label: string
  to: string
}

export const navigationRoutes: readonly NavigationRoute[] = [
  {
    to: routePaths.app,
    label: 'Mi espacio',
    description: 'Resumen del cliente y próximos pasos.',
    allowedRoles: ['CLIENT', 'ADMIN'],
  },
  {
    to: routePaths.admin,
    label: 'Administración',
    description: 'Panel operativo para administración general.',
    allowedRoles: ['ADMIN'],
  },
  {
    to: routePaths.stock,
    label: 'Stock',
    description: 'Gestión de inventario y disponibilidad.',
    allowedRoles: ['ADMIN', 'STOCK'],
  },
  {
    to: routePaths.orders,
    label: 'Pedidos',
    description: 'Seguimiento y preparación de pedidos.',
    allowedRoles: ['ADMIN', 'PEDIDOS'],
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
    return routePaths.orders
  }

  return routePaths.app
}
