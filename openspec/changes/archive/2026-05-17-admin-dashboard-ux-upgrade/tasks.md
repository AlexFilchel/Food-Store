# Tasks — admin-dashboard-ux-upgrade

## Sprint 1 (single-page scope only)

- [x] S1-T01 [spec] Update proposal/design/spec to codify hard scope boundary: only `admin-dashboard-metrics-page`; explicitly cancel Ventas/Inventario separate screens and sidebar submenu expansion.
- [x] S1-T02 [backend] Validate/add additive `effective_filters` contract (`from`, `to`, `from_utc`, `to_utc`, `timezone`, `granularity`) with `[from,to)` semantics and timezone fallback.
- [x] S1-T03 [backend] Validate/add additive `kpi_comparisons[]` contract with previous-period formula, comparability flags, and deterministic rounding/trend rules.
- [x] S1-T04 [backend] Validate/add additive `health` contract for order/payment status insights (`pending`, `cancelled`, `rejected`, `stuck`) without conflating state vs payment status.
- [x] S1-T05 [frontend] Keep all Sprint 1 UI changes inside `frontend/src/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page.tsx` (KPI cards, trend/comparison, global filters, timezone display).
- [x] S1-T06 [frontend] Ensure unavailable-state rendering for optional missing additive fields without breaking the page.
- [x] S1-T07 [config] Keep feature flag gate `VITE_ADMIN_DASHBOARD_UX_UPGRADE` default `false` for controlled rollout of Sprint 1 blocks.
- [ ] S1-T08 [verification] Execute Sprint 1 acceptance matrix for KPI/date/timezone/health inside one-page scope only.

## Sprint 2 (single-page scope only)

- [x] S2-T01 [backend] Validate/add additive trend bucket contract (`bucket_start`, `bucket_end`, `label`, `gross_revenue`, `order_count`) with zero-fill and deterministic ordering.
- [x] S2-T02 [frontend] Implement/adjust chart + table parity exclusively in metrics page, preserving accessibility and same totals.
- [x] S2-T03 [frontend] Implement/adjust category insights, top-products insights, order/payment status insights, recent sales panel, and operational alerts within the same page composition.
- [x] S2-T04 [frontend] Enforce drill-down policy: only links to existing `/admin/orders` and `/admin/products`; no new pages.
- [x] S2-T05 [frontend] If existing target view cannot hydrate required params, render disabled/partial action with explanatory copy (no workaround via new screens).
- [x] S2-T06 [frontend] Implement/adjust preference persistence for single-page dashboard view (`admin.dashboard.view.v1`) with safe reset behavior.
- [x] S2-T07 [config] Keep `VITE_ADMIN_DASHBOARD_UX_UPGRADE_TRENDS` default `false` and scoped only to Sprint 2 blocks on the same page.
- [ ] S2-T08 [verification] Execute Sprint 2 acceptance matrix for chart/table parity, insights, alerts, recent sales, drill-down graceful behavior, and single-page scope guard.

## Cross-sprint guardrails

- [x] G-T01 [architecture] Confirm no artifact/task introduces dedicated Ventas or Inventario screens/subsections.
- [x] G-T02 [architecture] Confirm no artifact/task requires sidebar submenu expansion.
- [x] G-T03 [rollout] Validate rollback path is only flag disablement with additive backend compatibility preserved.
