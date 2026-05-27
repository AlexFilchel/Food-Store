## ADDED Requirements

### Requirement: Kitchen role seed
The system SHALL define an idempotent `COCINA` role for operational kitchen users without changing automatic customer registration role assignment.

#### Scenario: Kitchen role is seeded
- **WHEN** role seed data is applied one or more times
- **THEN** role `COCINA` exists with display name `Cocinero`
- **AND** duplicate role rows are not created

#### Scenario: Customer registration still assigns only client role
- **WHEN** a new customer registers through public registration
- **THEN** the system assigns role `CLIENT` automatically and does not assign role `COCINA`

### Requirement: Kitchen endpoint role authorization
The backend SHALL allow users with role `COCINA`, `PEDIDOS`, or `ADMIN` to access kitchen endpoints and SHALL reject other roles.

#### Scenario: Kitchen role accesses kitchen endpoint
- **GIVEN** an authenticated user has role `COCINA`
- **WHEN** they call a protected kitchen endpoint
- **THEN** backend RBAC allows the request to reach the endpoint handler

#### Scenario: Non-kitchen role is denied kitchen endpoint
- **GIVEN** an authenticated user lacks roles `COCINA`, `PEDIDOS`, and `ADMIN`
- **WHEN** they call a protected kitchen endpoint
- **THEN** backend RBAC rejects the request with HTTP 403 using the canonical error contract

### Requirement: Kitchen FSM transition authorization
The system SHALL authorize role `COCINA` only for FSM transitions `CONFIRMADO -> EN_PREPARACION` and `EN_PREPARACION -> EN_CAMINO` and SHALL reject any other transition requested by that role.

#### Scenario: Kitchen user starts preparation
- **GIVEN** an authenticated user has role `COCINA` and an order is in `CONFIRMADO`
- **WHEN** the user requests transition to `EN_PREPARACION`
- **THEN** the FSM authorization allows the transition

#### Scenario: Kitchen user marks preparation finished
- **GIVEN** an authenticated user has role `COCINA` and an order is in `EN_PREPARACION`
- **WHEN** the user requests transition to `EN_CAMINO`
- **THEN** the FSM authorization allows the transition

#### Scenario: Kitchen user cannot deliver order
- **GIVEN** an authenticated user has role `COCINA` and an order is in `EN_CAMINO`
- **WHEN** the user requests transition to `ENTREGADO`
- **THEN** the FSM authorization rejects the request with HTTP 403

#### Scenario: Kitchen user cannot cancel order
- **GIVEN** an authenticated user has role `COCINA` and an order is in `CONFIRMADO` or `EN_PREPARACION`
- **WHEN** the user requests transition to `CANCELADO`
- **THEN** the FSM authorization rejects the request with HTTP 403
