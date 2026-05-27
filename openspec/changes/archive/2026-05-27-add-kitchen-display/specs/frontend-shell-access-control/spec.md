## MODIFIED Requirements

### Requirement: Role-restricted route access
The system SHALL restrict configured frontend routes by role codes from the authenticated user profile, including `/cocina` for users with role `COCINA`, `PEDIDOS`, or `ADMIN`.

#### Scenario: User has allowed role
- **WHEN** an authenticated user has at least one role required by a role-restricted route
- **THEN** the frontend allows the route to render

#### Scenario: User lacks allowed role
- **WHEN** an authenticated user lacks all roles required by a role-restricted route
- **THEN** the frontend renders or redirects to an access-denied experience without rendering restricted content

#### Scenario: Role restriction is frontend-only UX protection
- **WHEN** a role-restricted frontend route is rendered
- **THEN** backend API calls still rely on backend RBAC responses as the authorization source of truth

#### Scenario: Authorized user reaches kitchen route
- **GIVEN** an authenticated user has role `COCINA`, `PEDIDOS`, or `ADMIN`
- **WHEN** they navigate to `/cocina`
- **THEN** the frontend renders the kitchen display inside the authenticated shell

#### Scenario: Unauthorized user is denied kitchen route
- **GIVEN** an authenticated user lacks roles `COCINA`, `PEDIDOS`, and `ADMIN`
- **WHEN** they navigate to `/cocina`
- **THEN** the frontend renders or redirects to an access-denied experience without rendering the kitchen display

### Requirement: Role-aware navigation
The system SHALL render navigation entries based on the authenticated user's role codes, including a kitchen display entry for sessions with role `COCINA`, `PEDIDOS`, or `ADMIN`.

#### Scenario: Client user navigation
- **WHEN** an authenticated user has role `CLIENT`
- **THEN** the shell shows client-appropriate navigation entries and hides admin/operator-only entries

#### Scenario: Admin or operator navigation
- **WHEN** an authenticated user has role `ADMIN`, `STOCK`, `PEDIDOS` or `COCINA`
- **THEN** the shell shows entries allowed for those roles and hides entries not allowed for the user's roles

#### Scenario: Navigation remains accessible
- **WHEN** navigation is rendered on desktop or mobile viewport sizes
- **THEN** the user can identify the active section, reach allowed routes and trigger logout using accessible controls

#### Scenario: Kitchen-capable user sees kitchen navigation
- **GIVEN** an authenticated user has role `COCINA`, `PEDIDOS`, or `ADMIN`
- **WHEN** the shell renders navigation
- **THEN** it includes a navigation entry for `/cocina`

#### Scenario: Customer-only user does not see kitchen navigation
- **GIVEN** an authenticated user has only role `CLIENT`
- **WHEN** the shell renders navigation
- **THEN** it hides the kitchen display navigation entry

## ADDED Requirements

### Requirement: Kitchen default destination
The frontend SHALL route a user whose only operational role is `COCINA` to `/cocina` after login or session restoration.

#### Scenario: Cocina user lands on kitchen display
- **GIVEN** an authenticated user has role `COCINA` and no higher-priority destination has been requested
- **WHEN** login or session restoration completes
- **THEN** the frontend navigates the user to `/cocina`

### Requirement: Kitchen route idle-session behavior
The frontend SHALL exclude `/cocina` from inactivity auto-logout while preserving normal authentication expiration handling.

#### Scenario: Kitchen display remains active during idle shift
- **GIVEN** an authenticated kitchen-capable user is viewing `/cocina`
- **WHEN** the user does not interact with the page for the configured inactivity timeout
- **THEN** the frontend does not auto-logout solely because of inactivity on that route

#### Scenario: Expired authentication still clears kitchen session
- **GIVEN** an authenticated kitchen-capable user is viewing `/cocina`
- **WHEN** token validation or refresh fails with an unrecoverable authentication error
- **THEN** the frontend clears auth state and returns to an unauthenticated route
