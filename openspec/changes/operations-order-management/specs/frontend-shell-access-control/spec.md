# Delta for frontend-shell-access-control

## ADDED Requirements

### Requirement: Operations order routes

The authenticated frontend shell MUST expose operations order list and detail routes only to users with role `ADMIN` or `PEDIDOS`. Frontend restrictions are UX protection only; backend RBAC responses remain authoritative.

#### Scenario: Allowed operator reaches order management

- GIVEN an authenticated user with role `ADMIN` or `PEDIDOS`
- WHEN they navigate to the operations order list or detail route
- THEN the frontend renders the operations order management experience inside the protected shell

#### Scenario: Customer is denied operations routes

- GIVEN an authenticated user with only role `CLIENT`
- WHEN they navigate to an operations order route
- THEN the frontend MUST render or redirect to access denied
- AND operations order data is not rendered

#### Scenario: Anonymous user is redirected

- GIVEN an anonymous user
- WHEN they navigate to an operations order route
- THEN the frontend redirects to login without rendering protected content

### Requirement: Operations order navigation

The shell SHOULD show an order-management navigation entry to `ADMIN` and `PEDIDOS` users and SHALL NOT show that entry to customer-only users.

#### Scenario: Operator sees navigation entry

- GIVEN an authenticated user has role `PEDIDOS`
- WHEN the shell renders navigation
- THEN it includes an operations order-management entry

#### Scenario: Customer navigation stays customer-only

- GIVEN an authenticated user has only role `CLIENT`
- WHEN the shell renders navigation
- THEN it hides operations/admin order-management entries
- AND customer order tracking navigation remains available

### Requirement: Operations order UI states and actions

The operations UI MUST present list/detail loading, empty, error, and forbidden states. It SHALL render transition actions from server-provided allowed actions and MUST refresh displayed order state after a successful action.

#### Scenario: Allowed action is completed

- GIVEN operational detail includes an allowed action
- WHEN the operator submits that action successfully
- THEN the UI shows the updated order state and transition history

#### Scenario: Backend rejects stale action

- GIVEN the UI displays an action that is no longer valid
- WHEN the backend rejects the action with an FSM or authorization error
- THEN the UI shows a stable error and refreshes or invalidates stale order data
