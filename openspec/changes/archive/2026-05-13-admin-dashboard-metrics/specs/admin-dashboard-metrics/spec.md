## ADDED Requirements

### Requirement: Admin metrics access control
The system SHALL expose administrative dashboard metrics only to authenticated users with authorized administrative roles. Unauthenticated users and customers MUST NOT access global business metrics.

#### Scenario: Admin accesses metrics
- **GIVEN** an authenticated user with role `ADMIN`
- **WHEN** the user requests administrative dashboard metrics
- **THEN** the system returns the metrics payload

#### Scenario: Customer is rejected
- **GIVEN** an authenticated user with role `CLIENT`
- **WHEN** the user requests administrative dashboard metrics
- **THEN** the system rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Anonymous user is rejected
- **GIVEN** a request without valid authentication
- **WHEN** the request targets administrative dashboard metrics
- **THEN** the system rejects the request with HTTP 401 using the canonical error contract

### Requirement: Temporal filters and timezone
The system SHALL support explicit temporal filtering for dashboard metrics using `from`, `to`, `granularity`, and `timezone`. Persisted timestamps remain UTC, but bucket labels and period grouping MUST use the requested timezone or the default business timezone `America/Argentina/Buenos_Aires`.

#### Scenario: Default temporal filter is applied
- **GIVEN** an ADMIN requests dashboard metrics without an explicit date range
- **WHEN** the metrics are calculated
- **THEN** the system uses a documented default range of the last 30 days
- **AND** the response includes the effective `from`, `to`, `granularity`, and `timezone`

#### Scenario: Local timezone controls bucket boundaries
- **GIVEN** orders exist near UTC midnight
- **WHEN** an ADMIN requests daily sales with timezone `America/Argentina/Buenos_Aires`
- **THEN** the system groups those sales into local business days, not raw UTC days

#### Scenario: Invalid range is rejected
- **GIVEN** an ADMIN provides `from` later than `to`
- **WHEN** dashboard metrics are requested
- **THEN** the system rejects the request with a stable validation error

### Requirement: Summary KPIs
The system SHALL provide summary KPIs for the selected period: gross approved revenue, total counted orders, average ticket, and operational pending count.

#### Scenario: Summary excludes unpaid and cancelled orders from revenue
- **GIVEN** the selected period contains approved, pending, rejected, and cancelled orders
- **WHEN** summary KPIs are calculated
- **THEN** gross approved revenue includes only orders with approved payment and non-cancelled revenue states
- **AND** pending, rejected, and cancelled orders do not increase revenue

#### Scenario: Average ticket uses counted revenue orders
- **GIVEN** the selected period has approved revenue orders
- **WHEN** average ticket is calculated
- **THEN** the system divides gross approved revenue by the number of orders counted for revenue

#### Scenario: Empty period returns zero metrics
- **GIVEN** the selected period has no matching orders
- **WHEN** summary KPIs are calculated
- **THEN** revenue, order count, average ticket, and pending count are returned as zero values

### Requirement: Sales by period
The system SHALL provide sales totals grouped by the requested granularity. Supported granularities SHALL include `day`, `week`, and `month`.

#### Scenario: Daily sales are returned in chronological order
- **GIVEN** an ADMIN requests sales by period with granularity `day`
- **WHEN** sales are calculated
- **THEN** the response contains chronological daily buckets for the effective range
- **AND** each bucket includes revenue and order count

#### Scenario: Unsupported granularity is rejected
- **GIVEN** an ADMIN requests sales with unsupported granularity `hour`
- **WHEN** dashboard metrics are requested
- **THEN** the system rejects the request with a stable validation error

### Requirement: Top products metrics
The system SHALL provide top products for the selected period using immutable order item snapshots, not current product catalog price or name. Top products SHALL include product identity when available, display name, units sold, gross revenue, and order count.

#### Scenario: Product rename does not rewrite historical metrics
- **GIVEN** an order item snapshot was created before a product was renamed
- **WHEN** top products are calculated for that historical period
- **THEN** the metric uses the order item snapshot values for historical display and revenue

#### Scenario: Top products are ranked by revenue by default
- **GIVEN** multiple products have approved sales in the selected period
- **WHEN** top products are requested without a ranking override
- **THEN** the response orders products by gross revenue descending
- **AND** limits the result set to the documented default limit

#### Scenario: Cancelled orders are excluded from top products
- **GIVEN** a product appears only in cancelled orders during the selected period
- **WHEN** top products are calculated
- **THEN** that product does not contribute units or revenue to top products

### Requirement: Orders by state metrics
The system SHALL provide order counts grouped by the canonical order FSM states for the selected period.

#### Scenario: Orders are grouped by FSM state
- **GIVEN** the selected period contains orders in `PENDIENTE`, `CONFIRMADO`, `EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`, and `CANCELADO`
- **WHEN** orders by state are calculated
- **THEN** the response includes counts grouped by those canonical states

#### Scenario: Zero states remain visible
- **GIVEN** no orders exist in one or more canonical states during the selected period
- **WHEN** orders by state are returned
- **THEN** the response includes those states with count zero or enough metadata for the frontend to render them consistently

### Requirement: Dashboard metrics frontend
The system SHALL provide an ADMIN-only frontend dashboard view that renders summary KPIs, sales by period, top products, and orders by state from backend metrics.

#### Scenario: Admin views dashboard metrics
- **GIVEN** an authenticated ADMIN opens the administrative dashboard metrics page
- **WHEN** metrics load successfully
- **THEN** the page displays summary KPI cards, sales by period, top products, and orders by state

#### Scenario: Dashboard displays loading empty and error states
- **GIVEN** metrics are loading, empty, or failed
- **WHEN** the dashboard page renders
- **THEN** the page shows clear loading, empty, and error states without exposing raw technical details

#### Scenario: Dashboard filters refresh metrics
- **GIVEN** an ADMIN changes the date range or granularity filter
- **WHEN** the filter is applied
- **THEN** the frontend requests metrics with the selected filters
- **AND** updates every dashboard section from the backend response
