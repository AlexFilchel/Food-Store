export function AppPage() {
  return <RolePlaceholderPage badge="CLIENT" description="Tu resumen de compras, pedidos recientes y próximos pasos van a vivir acá." title="Espacio del cliente" />
}

function RolePlaceholderPage({ badge, description, title }: { badge: string; description: string; title: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-900">{badge}</span>
      <h2 className="mt-4 text-3xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </section>
  )
}
