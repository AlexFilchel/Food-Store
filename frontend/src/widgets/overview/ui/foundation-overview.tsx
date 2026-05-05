import { HealthStatusCard } from '@/features/health-status/ui/health-status-card'
import { appEnv } from '@/shared/config/env'
import { AppShell } from '@/shared/ui/app-shell'

export function FoundationOverview() {
  return (
    <AppShell>
      <section className="space-y-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
            bootstrap-foundation
          </p>
          <h1 className="text-3xl font-bold">Food Store listo para crecer</h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
            Esta pantalla mínima valida el shell React + Vite + TypeScript, providers globales,
            Tailwind, TanStack Query, Zustand y el cliente HTTP compartido contra el backend.
          </p>
        </div>

        <dl className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-background)] p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              App
            </dt>
            <dd className="mt-2 text-lg font-semibold">{appEnv.appName}</dd>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-background)] p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              API base URL
            </dt>
            <dd className="mt-2 break-all text-lg font-semibold">{appEnv.apiUrl}</dd>
          </div>
        </dl>

        <HealthStatusCard />
      </section>
    </AppShell>
  )
}
