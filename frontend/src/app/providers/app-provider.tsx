import type { PropsWithChildren } from 'react'

import { QueryProvider } from '@/app/providers/query-provider'

export function AppProvider({ children }: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>
}
