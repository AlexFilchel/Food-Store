# Admin Dashboard Metrics API

## Endpoint

- `GET /api/v1/admin/dashboard/metrics`
- Auth: Bearer token
- Roles: `ADMIN` only

## Query filters

- `from` (optional, ISO datetime)
- `to` (optional, ISO datetime)
- `granularity` (optional: `day` | `week` | `month`, default `day`)
- `timezone` (optional, IANA TZ, default `America/Argentina/Buenos_Aires`)

If `from`/`to` are omitted, backend applies last 30 days.

## Response shape

- `effective_filters`: effective UTC range + granularity + timezone
- `summary`:
  - `gross_approved_revenue`
  - `counted_orders`
  - `average_ticket`
  - `pending_operational_count`
- `sales_by_period[]`: label, gross revenue, order count
- `top_products[]`: product identity + snapshot display name + units, revenue, order count
- `orders_by_state[]`: canonical FSM states with zero-state support

## Formulas

- Revenue includes only orders with:
  - payment status `APPROVED`
  - order state in `CONFIRMADO`, `EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`
- Revenue excludes:
  - `PENDIENTE`, `CANCELADO`
  - non-approved payment statuses
- Average ticket: `gross_approved_revenue / counted_orders` (zero-safe)
- Top products use immutable `order_items` snapshots (`product_name`, `product_slug`, `unit_price`, `line_total`)
