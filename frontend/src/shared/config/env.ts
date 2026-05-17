interface AppEnv {
  appName: string
  apiUrl: string
  mpPublicKey: string
  adminDashboardUxUpgrade: boolean
  adminDashboardUxUpgradeTrends: boolean
}

export const appEnv: AppEnv = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Food Store',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  mpPublicKey: import.meta.env.VITE_MP_PUBLIC_KEY ?? 'TEST-placeholder-key',
  adminDashboardUxUpgrade: String(import.meta.env.VITE_ADMIN_DASHBOARD_UX_UPGRADE ?? 'false').toLowerCase() === 'true',
  adminDashboardUxUpgradeTrends: String(import.meta.env.VITE_ADMIN_DASHBOARD_UX_UPGRADE_TRENDS ?? 'false').toLowerCase() === 'true',
}
