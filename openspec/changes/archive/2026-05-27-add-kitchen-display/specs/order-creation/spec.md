## MODIFIED Requirements

### Requirement: Explicit order lifecycle FSM
The system MUST allow order state changes only through this matrix: `PENDIENTE -> CONFIRMADO|CANCELADO`, `CONFIRMADO -> EN_PREPARACION|CANCELADO`, `EN_PREPARACION -> EN_CAMINO|CANCELADO`, `EN_CAMINO -> ENTREGADO`; `ENTREGADO` and `CANCELADO` SHALL be terminal. The display label for `EN_PREPARACION` MAY be "En Preparación", but FSM rules and API requests MUST use the state code.

#### Scenario: Valid transition is accepted
- **GIVEN** an order in `CONFIRMADO`
- **WHEN** an authorized admin, pedidos operator, or cocina operator transitions it to `EN_PREPARACION`
- **THEN** the order state becomes `EN_PREPARACION`

#### Scenario: Invalid transition is rejected
- **GIVEN** an order in `PENDIENTE`
- **WHEN** any actor attempts to transition it to `ENTREGADO`
- **THEN** the system rejects with a stable FSM error

### Requirement: Role-based transition permissions
The system SHALL enforce actor permissions: customers MAY cancel only their own `PENDIENTE` orders; admins MAY perform operational transitions and permitted cancellations; pedidos operators MAY perform order-management transitions; cocina operators MAY perform only `CONFIRMADO -> EN_PREPARACION` and `EN_PREPARACION -> EN_CAMINO`; system actors MAY perform payment-driven transitions only.

#### Scenario: Unauthorized customer transition is rejected
- **GIVEN** a customer does not own an order
- **WHEN** the customer requests cancellation or transition
- **THEN** the system rejects with HTTP 403

#### Scenario: Cocina role is restricted to preparation transitions
- **GIVEN** an authenticated user has role `COCINA`
- **WHEN** the user requests a transition other than `CONFIRMADO -> EN_PREPARACION` or `EN_PREPARACION -> EN_CAMINO`
- **THEN** the system rejects the transition with HTTP 403

### Requirement: Immutable transition audit
Every accepted order transition MUST append an immutable history entry containing previous state, new state, actor type, actor id when present, source, reason, and timestamp. Transition audit entries MUST NOT be edited or deleted by business flows, including transitions executed by role `COCINA`.

#### Scenario: Audit captures system transition
- **GIVEN** payment approval confirms a pending order
- **WHEN** the system applies `PENDIENTE -> CONFIRMADO`
- **THEN** history records actor type `system`, source `payment`, and the payment reference

#### Scenario: Audit captures cocina transition
- **GIVEN** an authenticated cocina operator transitions an order from `CONFIRMADO` to `EN_PREPARACION`
- **WHEN** the transition is accepted
- **THEN** history records the previous state, new state, actor type or source for cocina, the cocina user's id, and timestamp

## ADDED Requirements

### Requirement: Kitchen event publication after order transitions
The system SHALL publish kitchen display events after committed lifecycle transitions that affect the kitchen queue.

#### Scenario: Payment confirmation publishes kitchen event
- **GIVEN** an order transitions from `PENDIENTE` to `CONFIRMADO`
- **WHEN** the transition transaction commits
- **THEN** the system publishes a `PEDIDO_CONFIRMADO` kitchen event

#### Scenario: Preparation transition publishes kitchen event
- **GIVEN** an order transitions from `CONFIRMADO` to `EN_PREPARACION`
- **WHEN** the transition transaction commits
- **THEN** the system publishes a `PEDIDO_EN_PREPARACION` kitchen event

#### Scenario: Finished preparation publishes kitchen event
- **GIVEN** an order transitions from `EN_PREPARACION` to `EN_CAMINO`
- **WHEN** the transition transaction commits
- **THEN** the system publishes a `PEDIDO_EN_CAMINO` kitchen event

#### Scenario: Kitchen-phase cancellation publishes kitchen event
- **GIVEN** an order in `CONFIRMADO` or `EN_PREPARACION` transitions to `CANCELADO`
- **WHEN** the transition transaction commits
- **THEN** the system publishes a `PEDIDO_CANCELADO` kitchen event

#### Scenario: No kitchen clients connected is not an error
- **GIVEN** no KDS clients are connected
- **WHEN** a kitchen event is published after commit
- **THEN** the transition remains successful and the event is discarded without failing the request
