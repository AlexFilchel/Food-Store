# Delta for order-creation

## MODIFIED Requirements

### Requirement: Explicit order lifecycle FSM

The system MUST allow order state changes only through this matrix: `PENDIENTE -> CONFIRMADO|CANCELADO`, `CONFIRMADO -> EN_PREPARACION|CANCELADO`, `EN_PREPARACION -> EN_CAMINO|CANCELADO`, `EN_CAMINO -> ENTREGADO`; `ENTREGADO` and `CANCELADO` SHALL be terminal.

#### Scenario: Valid transition is accepted

- GIVEN an order in `CONFIRMADO`
- WHEN an authorized admin transitions it to `EN_PREPARACION`
- THEN the order state becomes `EN_PREPARACION`
- AND exactly one transition audit record is appended

#### Scenario: Invalid transition is rejected

- GIVEN an order in `PENDIENTE`
- WHEN any actor attempts to transition it to `ENTREGADO`
- THEN the system MUST reject the request with a stable FSM error
- AND the order state and audit trail MUST remain unchanged

### Requirement: Role-based transition permissions

The system SHALL enforce actor permissions: customers MAY cancel only their own `PENDIENTE` orders; admins MAY perform operational transitions and permitted cancellations; system actors MAY perform payment-driven transitions only.

#### Scenario: Customer cancels own pending order

- GIVEN a customer owns an order in `PENDIENTE`
- WHEN the customer requests cancellation with a reason
- THEN the order transitions to `CANCELADO`
- AND the audit actor is recorded as that customer

#### Scenario: Unauthorized customer action is rejected

- GIVEN a customer does not own an order
- WHEN the customer requests any transition for that order
- THEN the system SHALL reject the action with HTTP 403
- AND no audit record SHALL be created

### Requirement: Immutable transition audit

Every accepted order transition MUST append an immutable history entry containing previous state, new state, actor type, actor id when present, source, reason, and timestamp. Transition audit entries MUST NOT be edited or deleted by business flows.

#### Scenario: Audit captures system transition

- GIVEN payment approval confirms a pending order
- WHEN the system applies `PENDIENTE -> CONFIRMADO`
- THEN history records actor type `system`, source `payment`, and the payment reference

### Requirement: Stock side effects on lifecycle changes

Order creation SHALL decrement stock once in the creation transaction. Cancellation MUST restore item stock exactly once. Non-cancel transitions MUST NOT change stock.

#### Scenario: Cancellation restores stock once

- GIVEN an order reserved two units at creation
- WHEN the order transitions to `CANCELADO`
- THEN stock increases by two units
- AND repeating the cancellation request MUST NOT increase stock again

## MODIFIED Requirements

### Requirement: OrderHistory append-only under FSM control

Order history SHALL be the append-only audit trail for FSM transitions and SHALL be written only after a transition is accepted. (Previously: history recorded state transitions without centralized FSM rules.)

#### Scenario: Invalid transition has no history

- GIVEN an order in terminal `CANCELADO`
- WHEN any actor attempts another transition
- THEN the system MUST reject the transition
- AND the history count remains unchanged
