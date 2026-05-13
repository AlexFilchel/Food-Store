## 1. Backend contracts and routing

- [x] 1.1 Inspect existing order, payment, product, auth/RBAC, and admin route structure to place metrics code without duplicating domain logic
- [x] 1.2 Define dashboard metrics request schema with `from`, `to`, `granularity`, `timezone`, and safe defaults
- [x] 1.3 Define response schemas for summary KPIs, sales-by-period buckets, top products, orders-by-state, and effective filters
- [x] 1.4 Add protected administrative metrics route using backend RBAC with `ADMIN` access by default
- [x] 1.5 Ensure unauthorized, unauthenticated, and customer requests return canonical 401/403 errors

## 2. Metrics formulas and query layer

- [x] 2.1 Implement timezone-aware range normalization from business timezone to UTC boundaries
- [x] 2.2 Implement validation for invalid ranges, unsupported granularities, and invalid timezone input
- [x] 2.3 Implement revenue eligibility filter: approved payment plus non-cancelled revenue order states
- [x] 2.4 Implement summary KPI query for gross approved revenue, counted orders, average ticket, and operational pending count
- [x] 2.5 Implement sales-by-period aggregation for `day`, `week`, and `month` with chronological bucket output
- [x] 2.6 Implement top-products aggregation using order item snapshots rather than current product values
- [x] 2.7 Implement orders-by-state aggregation across canonical FSM states with zero-state support
- [x] 2.8 Review query plans/index needs for date, order state, payment status, and order item joins; add safe indexes only if needed

## 3. Backend tests

- [x] 3.1 Add permission tests for ADMIN success, CLIENT forbidden, and anonymous unauthorized access
- [x] 3.2 Add formula tests proving pending, rejected, expired, and cancelled orders do not inflate revenue
- [x] 3.3 Add average-ticket and empty-period tests
- [x] 3.4 Add timezone bucket tests for orders near UTC midnight grouped in `America/Argentina/Buenos_Aires`
- [x] 3.5 Add sales granularity validation tests for supported and unsupported granularities
- [x] 3.6 Add top-products tests proving historical item snapshots are used after product rename or price change
- [x] 3.7 Add orders-by-state tests including states with zero count

## 4. Frontend API and state integration

- [x] 4.1 Add frontend TypeScript types matching the backend dashboard metrics contract
- [x] 4.2 Add dashboard metrics API client function with query parameters for range, granularity, and timezone
- [x] 4.3 Add server-state hook/query for dashboard metrics with stable query keys including all filter inputs
- [x] 4.4 Normalize frontend error handling so backend validation/permission failures show user-safe messages

## 5. Admin dashboard UI

- [x] 5.1 Add protected admin dashboard metrics route/page within the existing frontend shell
- [x] 5.2 Add date range, granularity, and timezone/default filter controls that refresh metrics from backend
- [x] 5.3 Render summary KPI cards for revenue, counted orders, average ticket, and pending/operational count
- [x] 5.4 Render sales by period in a readable chart or table with chronological buckets
- [x] 5.5 Render top products with product name, units sold, revenue, and order count
- [x] 5.6 Render orders by state with canonical FSM states visible even when count is zero
- [x] 5.7 Add loading, empty, and error states for every dashboard section
- [x] 5.8 Ensure the page is read-only and does not mutate orders, payments, products, stock, or audit history

## 6. Verification and documentation

- [x] 6.1 Verify backend tests for metrics formulas, permissions, validation, and timezone behavior
- [x] 6.2 Verify frontend tests or component coverage for loading, empty, error, and successful render states where project patterns support it
- [x] 6.3 Manually verify the dashboard with fixture/seed data covering approved, pending, rejected, cancelled, and delivered orders
- [x] 6.4 Document the implemented endpoint path, filters, response shape, formulas, and timezone default in the change or API docs
- [x] 6.5 Re-run `openspec status --change "admin-dashboard-metrics"` and confirm the change is apply-ready
