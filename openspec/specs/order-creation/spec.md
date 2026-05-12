# Spec: order-creation

## Purpose

Define atomic order creation and lifecycle baseline rules: validated order item snapshots, stock reservation, delivery address resolution, and append-only order history under an explicit FSM.
## Requirements
### Requirement: Atomic order creation

Order, order items, stock decrement, and initial history entry SHALL be created in one transaction.

#### Scenario: Order creation commits all or nothing
- **GIVEN** a valid create-order request
- **WHEN** the order is created
- **THEN** order header, items, stock updates, and initial history are persisted atomically

### Requirement: Product and stock validation

The system SHALL validate product existence, active/available status, and sufficient stock before accepting order creation.

#### Scenario: Insufficient stock is rejected
- **GIVEN** one requested product has insufficient stock
- **WHEN** order creation is requested
- **THEN** the system rejects the request
- **AND** does not mutate order or stock data

### Requirement: Delivery address resolution

Order creation SHALL use an explicit `delivery_address_id` when provided, otherwise fallback to the user default delivery address.

#### Scenario: Missing explicit address uses default
- **GIVEN** a user has a default delivery address
- **WHEN** order creation omits `delivery_address_id`
- **THEN** the order uses the default address snapshot

### Requirement: Snapshot immutability

Order item snapshots SHALL persist immutable product name, slug, unit price, and customization snapshot at creation time.

#### Scenario: Product changes do not rewrite prior orders
- **GIVEN** an order already exists
- **WHEN** product catalog data changes later
- **THEN** existing order item snapshots remain unchanged

### Requirement: Explicit order lifecycle FSM

The system MUST allow order state changes only through this matrix: `PENDIENTE -> CONFIRMADO|CANCELADO`, `CONFIRMADO -> EN_PREPARACION|CANCELADO`, `EN_PREPARACION -> EN_CAMINO|CANCELADO`, `EN_CAMINO -> ENTREGADO`; `ENTREGADO` and `CANCELADO` SHALL be terminal.

#### Scenario: Valid transition is accepted
- **GIVEN** an order in `CONFIRMADO`
- **WHEN** an authorized admin transitions it to `EN_PREPARACION`
- **THEN** the order state becomes `EN_PREPARACION`

#### Scenario: Invalid transition is rejected
- **GIVEN** an order in `PENDIENTE`
- **WHEN** any actor attempts to transition it to `ENTREGADO`
- **THEN** the system rejects with a stable FSM error

### Requirement: Role-based transition permissions

The system SHALL enforce actor permissions: customers MAY cancel only their own `PENDIENTE` orders; admins MAY perform operational transitions and permitted cancellations; system actors MAY perform payment-driven transitions only.

#### Scenario: Unauthorized customer transition is rejected
- **GIVEN** a customer does not own an order
- **WHEN** the customer requests cancellation or transition
- **THEN** the system rejects with HTTP 403

### Requirement: Immutable transition audit

Every accepted order transition MUST append an immutable history entry containing previous state, new state, actor type, actor id when present, source, reason, and timestamp. Transition audit entries MUST NOT be edited or deleted by business flows.

#### Scenario: Audit captures system transition
- **GIVEN** payment approval confirms a pending order
- **WHEN** the system applies `PENDIENTE -> CONFIRMADO`
- **THEN** history records actor type `system`, source `payment`, and the payment reference

### Requirement: OrderHistory append-only under FSM control

Order history SHALL be the append-only audit trail for FSM transitions and SHALL be written only after a transition is accepted. (Previously: history recorded state transitions without centralized FSM rules.)

#### Scenario: Invalid transition has no history

- GIVEN an order in terminal `CANCELADO`
- WHEN any actor attempts another transition
- THEN the system MUST reject the transition
- AND the history count remains unchanged

### Requirement: Stock side effects on lifecycle changes

Order creation SHALL decrement stock once. Transition to `CANCELADO` MUST restore item stock exactly once. Non-cancel transitions MUST NOT change stock.

#### Scenario: Repeated cancellation does not double-restore stock
- **GIVEN** an order already transitioned to `CANCELADO`
- **WHEN** cancellation is requested again
- **THEN** stock does not increase again

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

