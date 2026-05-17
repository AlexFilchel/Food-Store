## Context
La mejora UX se restringe estrictamente a la pantalla existente `frontend/src/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page.tsx`. No se crearán pantallas/subsecciones nuevas de Ventas o Inventario, ni expansión de submenús en sidebar. Este artefacto define contratos y decisiones de diseño; no implementa código.

## Goals / Non-Goals

**Goals**
- Consolidar el “Resumen general” en una sola pantalla con:
  - KPI cards con comparación/trend.
  - Tendencias con chart y fallback tabular equivalente.
  - Insights de categorías y top productos.
  - Insights de estados de órdenes y pagos.
  - Panel de ventas recientes.
  - Alertas operativas.
  - Filtros globales con comportamiento de timezone efectiva.
- Mantener estructura de dos sprints, ambos dentro de la misma página.
- Mantener compatibilidad mediante campos backend aditivos en snake_case.

**Non-Goals (cancelaciones explícitas)**
- Crear pantalla/sección separada de **Ventas**.
- Crear pantalla/sección separada de **Inventario**.
- Requerir expansión de submenú/sidebar para navegar estos contenidos.
- Cualquier drill-down que dependa de una página nueva.

## Architecture Decisions

### 1) Single-page scope as hard boundary
Toda capacidad nueva de este cambio DEBE renderizarse en `admin-dashboard-metrics-page`. Se permiten interacciones a vistas existentes únicamente cuando:
- existe ruta actual (`/admin/orders`, `/admin/products`), y
- la acción no exige crear una vista nueva.
Si una vista existente no soporta la hidratación necesaria, la acción se muestra deshabilitada con mensaje explicativo.

### 2) Global filters and timezone behavior
Se conserva semántica `[from,to)` con timezone IANA efectiva.
- `from` inclusivo, `to` exclusivo.
- Backend debe devolver `effective_filters` (`from`, `to`, `from_utc`, `to_utc`, `timezone`, `granularity`).
- Timezone inválida => fallback a `America/Argentina/Buenos_Aires` y eco de timezone efectiva.
- Presets soportados: `today`, `last_7_days`, `last_30_days`, `current_month`.

### 3) Resumen general data contract
El endpoint actual de métricas puede extenderse con campos aditivos para alimentar una sola composición visual:
- `kpi_comparisons[]` (current/previous, delta_absolute, delta_percent, trend, comparability).
- `sales_by_period` con buckets deterministas zero-filled para chart/tabla.
- `health` para pendientes/canceladas/rechazados/trabados.
- `category_insights` y `top_products_insights` (si aplica aditivo).
- `recent_sales` para panel de actividad reciente.
- `operational_alerts` para prioridades accionables.
Todos opcionales-safe en frontend.

### 4) Drill-down policy (existing views only)
- Permitido: `/admin/orders` con query params de filtros.
- Permitido: `/admin/products` con `product_id` o `product_slug` cuando sea soportado.
- No permitido: requerir nuevas páginas intermedias o secciones dedicadas.
- Fallback obligatorio: acción deshabilitada + copy de limitación actual.

### 5) Sprint containment
- **Sprint 1:** KPI comparison + health + filtros globales/timezone + base de rollout por flag.
- **Sprint 2:** chart/table parity + category/top-product insights + order/payment insights + recent sales + operational alerts + preferencias.
Ambos sprints permanecen dentro del mismo contenedor de página.

## Acceptance Alignment
- Criterio principal: no aparecen nuevas pantallas/subsecciones (Ventas/Inventario) ni nuevos submenús.
- Toda evidencia funcional debe mapear al árbol de componentes de `admin-dashboard-metrics-page`.

## Risks and Mitigations
- **Scope creep a nuevas vistas** (Med): bloquear por Non-Goals y revisión de aceptación por rutas.
- **Dependencias de hidratación no listas** (Med): degradación elegante con CTA deshabilitado.
- **Sobrecarga visual en una sola pantalla** (Med): priorización por bloques y jerarquía progresiva.

## Rollback
Desactivar `VITE_ADMIN_DASHBOARD_UX_UPGRADE` y `VITE_ADMIN_DASHBOARD_UX_UPGRADE_TRENDS`. Como los campos backend son aditivos, el rollback no requiere revertir contratos existentes.
