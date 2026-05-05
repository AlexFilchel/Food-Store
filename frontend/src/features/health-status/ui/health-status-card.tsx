import { useHealthQuery } from '@/features/health-status/model/use-health-query'

export function HealthStatusCard() {
  const healthQuery = useHealthQuery()

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-6">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">Backend status</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Server state gestionado con TanStack Query, no con Zustand.
        </p>
      </header>

      {healthQuery.isPending ? <p>Cargando estado del backend...</p> : null}

      {healthQuery.isError ? (
        <p className="text-sm font-medium text-red-600">
          No se pudo consultar el backend. Verificá `VITE_API_URL` y que FastAPI esté levantado.
        </p>
      ) : null}

      {healthQuery.data ? (
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-semibold">Estado:</span>{' '}
            <span className="text-[var(--color-success)]">{healthQuery.data.status}</span>
          </p>
          <p>
            <span className="font-semibold">Servicio:</span> {healthQuery.data.service}
          </p>
          <p>
            <span className="font-semibold">Timestamp:</span> {healthQuery.data.timestamp}
          </p>
        </div>
      ) : null}
    </section>
  )
}
