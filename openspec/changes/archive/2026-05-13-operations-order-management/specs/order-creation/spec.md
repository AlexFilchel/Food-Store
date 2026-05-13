# Delta for order-creation

## ADDED Requirements

### Requirement: Operational order listing

`ADMIN` and `PEDIDOS` users MUST be able to list all orders for operational work. The list SHALL support pagination plus filters for FSM state, date range, customer signal, and payment signal, and MUST sort deterministically newest first unless another supported sort is requested.

#### Scenario: Operator lists global orders

- GIVEN an authenticated user with role `ADMIN` or `PEDIDOS`
- WHEN they request the operational order list with pagination
- THEN the response contains orders across customers
- AND pagination metadata uses the project skip/limit/total convention

#### Scenario: Customer cannot list global orders

- GIVEN an authenticated user without `ADMIN` or `PEDIDOS`
- WHEN they request the operational order list
- THEN the system MUST reject the request with HTTP 403

### Requirement: Operational order detail

`ADMIN` and `PEDIDOS` users MUST be able to view full operational order detail including customer identity, delivery snapshot, item snapshots, payment summary, current FSM state, transition history, and currently allowed actions.

#### Scenario: Operator views full order context

- GIVEN an authenticated `PEDIDOS` user and an existing order
- WHEN they request operational order detail
- THEN the response includes customer, delivery, items, payment, state, history, and allowed actions

#### Scenario: Missing order remains safe

- GIVEN an authenticated `ADMIN` user
- WHEN they request operational detail for a nonexistent order
- THEN the system returns a stable not-found error without exposing unrelated data

### Requirement: Operational FSM actions

Operational users MUST execute state changes only through the existing order FSM. The backend SHALL enforce role and state permissions and SHALL append exactly one immutable transition audit entry for each accepted action.

#### Scenario: Allowed operational transition succeeds

- GIVEN an order in `CONFIRMADO` and an authenticated `PEDIDOS` user
- WHEN they transition it to `EN_PREPARACION` with an optional reason
- THEN the order state becomes `EN_PREPARACION`
- AND exactly one audit entry records the actor, source `operations`, reason, and timestamp

#### Scenario: Disallowed transition has no side effects

- GIVEN an order in terminal `ENTREGADO`
- WHEN an operator attempts to transition it to `CANCELADO`
- THEN the system MUST reject the action with a stable FSM error
- AND the order state, stock, and audit history remain unchanged

### Requirement: Operational reads do not mutate history

Operational list and detail reads SHALL NOT create, edit, or delete order history entries.

#### Scenario: Detail read preserves audit trail

- GIVEN an existing order with transition history
- WHEN an operator opens operational detail
- THEN the history entry count and contents remain unchanged
