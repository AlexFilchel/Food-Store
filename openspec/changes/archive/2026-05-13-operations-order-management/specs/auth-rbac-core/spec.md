# Delta for auth-rbac-core

## MODIFIED Requirements

### Requirement: Backend RBAC dependencies

The system SHALL provide reusable backend authorization dependencies to require an authenticated user and one or more allowed role codes. Operations order-management capabilities MUST require `ADMIN` or `PEDIDOS`; customer-only sessions MUST NOT access global operational order data or actions.
(Previously: protected endpoints could require one or more allowed roles, without naming operations order-management usage.)

#### Scenario: Allowed operations role reaches endpoint

- GIVEN an authenticated user has role `ADMIN` or `PEDIDOS`
- WHEN they call an operations order-management endpoint
- THEN the RBAC dependency allows the request to reach the endpoint handler

#### Scenario: Customer-only user is rejected

- GIVEN an authenticated user has only role `CLIENT`
- WHEN they call an operations order-management endpoint
- THEN the dependency rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Missing authentication is rejected

- GIVEN a request has no valid bearer token
- WHEN it calls an operations order-management endpoint
- THEN the dependency rejects the request with HTTP 401 using the canonical error contract
