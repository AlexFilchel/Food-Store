# Proposal: Admin Dashboard UX Upgrade

## Intent
Mejorar la toma de decisiones del admin dentro de la pantalla existente `admin-dashboard-metrics-page`, reforzando el “Resumen general” con contexto operativo y comparativo sin abrir nuevas pantallas.

## Scope

### In Scope
- **Sprint 1 (misma pantalla):** tarjetas KPI con comparación contra período anterior, panel de salud operativa, presets de fecha, filtros globales y visibilidad explícita de timezone efectiva.
- **Sprint 2 (misma pantalla):** tendencias (chart + tabla equivalente), insights de categorías y top productos, estados de órdenes/pagos, panel de ventas recientes, alertas operativas y persistencia segura de preferencias.
- Acciones/enlaces permitidos SOLO hacia vistas existentes (`/admin/orders`, `/admin/products`) sin crear páginas nuevas.

### Out of Scope
- Crear pantallas o subsecciones nuevas de **Ventas** o **Inventario**.
- Expandir/subdividir sidebar con submenús para este cambio.
- Reescrituras de routing/auth/RBAC, BI/forecasting/exportaciones o nuevos state machines de órdenes/pagos.

## Approach
Concentrar todo en `frontend/src/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page.tsx` y en campos aditivos del contrato actual de métricas. Se mantiene rollout por dos sprints, pero ambos acotados a la misma página y sin navegación obligatoria a nuevas secciones.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page.tsx` | Modified | UX completa de Resumen general (KPI, tendencias, insights, recientes, alertas, filtros) |
| `frontend/src/entities/admin-dashboard-metrics/model/types.ts` | Modified | Tipos aditivos snake_case para comparaciones, tendencias, health e insights |
| `frontend/src/features/admin-dashboard-metrics/model/hooks.ts` | Modified | Fetch con filtros globales y timezone efectiva |
| `frontend/src/shared/config/env.ts` | Modified | Flags de Sprint 1/2 sin alterar scope de una sola pantalla |
| `backend/app/modules/admin_dashboard_metrics/*` | Modified | Campos aditivos para soportar UX dentro de la misma pantalla |
| `frontend/src/pages/admin-orders-page/ui/admin-orders-page.tsx` | Modified if needed | Hidratación de filtros desde query params en vista existente |
| `frontend/src/pages/admin-products-page/ui/admin-products-page.tsx` | Modified if needed | Hidratación opcional de producto en vista existente o acción deshabilitada |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Deriva de alcance hacia nuevas pantallas (Ventas/Inventario) | Med | Non-goal explícito + aceptación exige una sola pantalla |
| Confusión por links no soportados | Med | Permitir solo links a vistas existentes; fallback deshabilitado con texto |
| Ambigüedad de timezone/filtros | Med | Contrato `[from,to)` + `effective_filters` obligatorio |

## Rollout / Verification
- Flags: `VITE_ADMIN_DASHBOARD_UX_UPGRADE` y `VITE_ADMIN_DASHBOARD_UX_UPGRADE_TRENDS`, default `false`.
- Rollback: desactivar flags; campos backend aditivos quedan backward-compatible.
- Verificación: matriz de aceptación de Sprint 1 y Sprint 2 centrada únicamente en `admin-dashboard-metrics-page`.

## Success Criteria
- [ ] Todo el alcance funcional vive en `admin-dashboard-metrics-page` (sin nuevas pantallas de Ventas/Inventario y sin submenús nuevos).
- [ ] “Resumen general” cubre KPI, comparativas, charts, insights de categorías/top productos, estados orden/pago, ventas recientes, alertas operativas y filtros globales con timezone efectiva.
- [ ] Cualquier drill-down usa solo vistas existentes o queda explícitamente deshabilitado sin requerir nuevas páginas.
