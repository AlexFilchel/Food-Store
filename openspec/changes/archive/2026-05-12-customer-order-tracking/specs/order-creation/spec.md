# Delta for order-creation

## ADDED Requirements

### Requirement: Customer order history

Authenticated customers MUST be able to list only their own orders, newest first. The list SHALL support state filtering and pagination metadata using the project skip/limit/total convention.

#### Scenario: Customer lists own orders
- GIVEN an authenticated customer with multiple orders
- WHEN they request the order history
- THEN the response contains only orders owned by that customer
- AND orders are sorted newest first with pagination metadata

#### Scenario: State filter limits results
- GIVEN an authenticated customer has orders in several FSM states
- WHEN they request history filtered by `CONFIRMADO`
- THEN every returned order has state `CONFIRMADO`
- AND the total reflects the filtered result set

#### Scenario: Cross-customer orders are hidden
- GIVEN another customer has orders in the system
- WHEN the authenticated customer lists order history
- THEN those other orders MUST NOT appear in items or totals

### Requirement: Customer order detail visibility

Authenticated customers MUST be able to view details for their own orders only. Detail SHALL include current FSM state, total, item snapshots, delivery address snapshot, payment summary, and transition history needed for customer visibility.

#### Scenario: Customer views own order detail
- GIVEN an authenticated customer owns an order
- WHEN they request that order detail
- THEN the response includes item snapshots, delivery snapshot, total, current state, payment summary, and visible history

#### Scenario: Customer cannot view another customer's order
- GIVEN an authenticated customer does not own an order
- WHEN they request that order detail
- THEN the system rejects or hides it without exposing order data

### Requirement: Post-creation order confirmation

After successful order creation, the customer experience SHALL provide enough order identity and payment state information to route the customer to confirmation, payment, or retry feedback.

#### Scenario: Created order can be confirmed to customer
- GIVEN order creation succeeds
- WHEN the frontend receives the creation result
- THEN it can identify the created order and show confirmation or next payment action
