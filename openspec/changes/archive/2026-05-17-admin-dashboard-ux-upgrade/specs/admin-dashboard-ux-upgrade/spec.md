## ADDED Requirements

### Requirement: Scope is restricted to the existing metrics main screen
The system SHALL deliver this change only within `admin-dashboard-metrics-page` and SHALL NOT require new Ventas/Inventario screens or sidebar submenu expansion.

#### Scenario: Explicit scope guard
- **GIVEN** the `admin-dashboard-ux-upgrade` change
- **WHEN** UX improvements are specified or implemented
- **THEN** all new UI capabilities MUST reside in `frontend/src/pages/admin-dashboard-metrics-page/ui/admin-dashboard-metrics-page.tsx`
- **AND** no new dedicated screen/subsection for `Ventas` is created
- **AND** no new dedicated screen/subsection for `Inventario` is created
- **AND** no sidebar submenu expansion is required for this change.

### Requirement: Resumen general composition in a single page
The system SHALL provide a strengthened “Resumen general” composition on the same metrics page.

#### Contract: Mandatory capability blocks
The single page MUST support these blocks (directly or with optional-safe unavailable states):
- KPI cards.
- Trend/comparison indicators.
- Charts with equivalent table fallback.
- Category insights and top products insights.
- Order/payment status insights.
- Recent sales panel.
- Operational alerts.
- Global filters and effective timezone behavior.

#### Scenario: Optional backend fields do not break page
- **GIVEN** one or more additive backend blocks are missing (`kpi_comparisons`, `health`, trend buckets, insights, alerts, recent sales)
- **WHEN** the metrics page renders
- **THEN** supported blocks still render
- **AND** missing blocks show non-blocking unavailable states
- **AND** the page does not crash.

### Requirement: KPI comparison contract
The system SHALL expose executive KPI comparisons using backend-owned previous-period math and snake_case fields.

#### Contract: KPI comparison fields
Dashboard response MAY include `kpi_comparisons[]` with:
- `key`, `label`, `value_type`
- `current_value`, `previous_value`
- `delta_absolute`, `delta_percent`, `trend`
- `comparison_from`, `comparison_to`
- `is_comparable`, `unavailable_reason`

#### Scenario: Previous period empty/null/zero
- **GIVEN** previous period has no rows, null, or numeric zero
- **WHEN** KPI comparisons are returned
- **THEN** `is_comparable=false`, `delta_percent=null`, `trend=null`
- **AND** UI shows a non-misleading unavailable state.

#### Scenario: Current zero and previous positive
- **GIVEN** current value is zero and previous value is positive
- **WHEN** KPI comparisons are returned
- **THEN** `is_comparable=true`, `delta_percent=-100.0`, and trend is `down`.

### Requirement: Global filters and timezone semantics
The system SHALL provide deterministic timezone-aware `[from,to)` behavior and echo effective filters.

#### Contract: Effective filters
Response MUST include `effective_filters.from`, `effective_filters.to`, `from_utc`, `to_utc`, `timezone`, and `granularity` in snake_case.

#### Contract: Presets
Supported presets: `today`, `last_7_days`, `last_30_days`, `current_month`.

#### Scenario: Invalid timezone fallback
- **GIVEN** requested timezone is invalid/unsupported
- **WHEN** metrics are computed
- **THEN** backend falls back to `America/Argentina/Buenos_Aires`
- **AND** response echoes that effective timezone.

### Requirement: Trend charts with table parity
The system SHALL provide deterministic trend buckets for chart rendering with table parity in the same page.

#### Contract: Buckets
- Buckets MUST be zero-filled and sorted ascending by `bucket_start`.
- Buckets MUST use `[bucket_start,bucket_end)` clipped to selected `[from,to)`.
- Each bucket MUST include `bucket_start`, `bucket_end`, `label`, `gross_revenue`, `order_count`.
- Labels: daily `YYYY-MM-DD`, weekly `YYYY-[W]ww`, monthly `YYYY-MM`.

#### Scenario: Chart/table equivalence
- **GIVEN** trend data is shown
- **WHEN** ADMIN toggles chart/table
- **THEN** both modes expose equivalent buckets and totals.

### Requirement: Insights and operational blocks
The system SHALL expose category/top-products insights, order/payment status insights, recent sales, and operational alerts in the same metrics page.

#### Scenario: Unified summary workflow
- **GIVEN** ADMIN reviews dashboard metrics
- **WHEN** loading succeeds
- **THEN** insights/alerts/recent-sales blocks are visible in the same page composition
- **AND** no dedicated secondary page is required.

### Requirement: Drill-down actions target existing views only
The system SHALL allow drill-down actions only when they target existing routes without creating new pages.

#### Contract: Allowed targets
- Orders: `/admin/orders` with supported query params.
- Products: `/admin/products` with `product_id` or `product_slug` when supported.

#### Scenario: Unsupported target hydration
- **GIVEN** target existing page cannot hydrate required query params yet
- **WHEN** ADMIN triggers drill-down action
- **THEN** action is disabled or marked partial with explanatory copy
- **AND** no new screen is introduced as workaround.

## Acceptance Criteria
- All delivered UX scope is contained in `admin-dashboard-metrics-page`.
- No separate Ventas/Inventario screens/subsections exist for this change.
- No sidebar submenu expansion is required by this change.
- Resumen general includes KPI, trends/charts, category/top-products insights, order/payment insights, recent sales, operational alerts, and global filters/timezone behavior.
- Drill-downs only target existing pages or degrade gracefully without creating new views.
- Sprint 1 and Sprint 2 acceptance both validate single-page scope.

## Non-Goals
- New Ventas screen/subsection.
- New Inventario screen/subsection.
- Sidebar submenu expansion.
- Any drill-down that requires new route/page creation.
- BI/forecasting/export initiatives unrelated to this page.
