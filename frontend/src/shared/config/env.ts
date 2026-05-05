interface AppEnv {
  appName: string
  apiUrl: string
  mpPublicKey: string
}

export const appEnv: AppEnv = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Food Store',
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  mpPublicKey: import.meta.env.VITE_MP_PUBLIC_KEY ?? 'TEST-placeholder-key',
}
