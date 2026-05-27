# frontend-shell-access-control Specification

## Purpose
TBD - created by archiving change frontend-shell-access-control. Update Purpose after archive.
## Requirements
### Requirement: Public and protected routing shell
The system SHALL provide a frontend routing shell that separates public routes from authenticated application routes.

#### Scenario: Anonymous user reaches public route
- **WHEN** an anonymous user navigates to `/login`, `/register` or `/`
- **THEN** the frontend renders the public route without requiring an access token

#### Scenario: Anonymous user reaches protected route
- **WHEN** an anonymous user navigates to a protected application route
- **THEN** the frontend redirects the user to the login route and does not render protected content

#### Scenario: Authenticated user reaches protected route
- **WHEN** an authenticated user with a valid session navigates to a protected application route
- **THEN** the frontend renders the protected route inside the authenticated shell

### Requirement: Session restoration and expiration handling
The system SHALL restore persisted frontend auth state by validating the current session against `GET /api/v1/auth/me` and SHALL clear invalid sessions.

#### Scenario: Persisted session is valid
- **WHEN** the application starts with persisted tokens and `/api/v1/auth/me` returns the current user
- **THEN** the frontend keeps the session active and renders protected content according to the user's roles

#### Scenario: Persisted session is expired or invalid
- **WHEN** the application starts with persisted tokens and the refresh/me flow fails with authentication failure
- **THEN** the frontend clears persisted auth state and redirects the user to login

#### Scenario: Session expires during API usage
- **WHEN** an authenticated API request receives an unrecoverable HTTP 401 after refresh retry
- **THEN** the frontend clears auth state and moves the user back to an unauthenticated route

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

### Requirement: Auth forms and logout flow
The system SHALL provide login, registration and logout UI flows wired to the existing auth API client.

#### Scenario: Successful login
- **WHEN** a user submits valid login credentials
- **THEN** the frontend stores the returned tokens/user and redirects to the authenticated shell

#### Scenario: Successful registration
- **WHEN** a new customer submits valid registration data
- **THEN** the frontend stores the returned tokens/user and redirects to the authenticated shell

#### Scenario: Auth form failure
- **WHEN** login or registration fails with canonical API validation or auth errors
- **THEN** the frontend displays a useful error without storing a partial session

#### Scenario: Successful logout
- **WHEN** an authenticated user triggers logout
- **THEN** the frontend calls the logout endpoint when a refresh token exists, clears local auth state and returns to a public route

### Requirement: Global auth and API error handling
The system SHALL provide consistent frontend handling for global authentication and authorization failures.

#### Scenario: Authorization failure
- **WHEN** a protected API call or route guard results in HTTP 403 or insufficient role state
- **THEN** the frontend presents an access-denied experience that preserves application stability

#### Scenario: Recoverable API failure
- **WHEN** a non-auth API failure occurs inside the shell
- **THEN** the frontend exposes the error through a shared, user-visible pattern without crashing the entire application

#### Scenario: No sensitive data exposure
- **WHEN** auth or API errors are rendered
- **THEN** the frontend does not display access tokens, refresh tokens or internal security metadata

### Requirement: Customer order tracking routes

The authenticated frontend shell SHALL expose customer order history, order detail, creation confirmation, and payment result routes only to authenticated customer-capable sessions.

#### Scenario: Authenticated customer reaches order history
- GIVEN an authenticated user with customer access
- WHEN they navigate to the order history route
- THEN the frontend renders the customer order tracking experience inside the authenticated shell

#### Scenario: Anonymous user is redirected
- GIVEN an anonymous user
- WHEN they navigate to order history, order detail, confirmation, or payment result routes that require a session
- THEN the frontend redirects to login without rendering customer order data

#### Scenario: API authorization failure stays safe
- GIVEN the frontend requests an order detail and receives HTTP 403 or 404
- WHEN the page handles the response
- THEN it shows a stable not-found or access-denied state without exposing sensitive data

### Requirement: Customer tracking navigation

The shell SHOULD provide a customer-facing navigation entry for order history and SHALL NOT expose operations/admin order-management navigation to customer-only users.

#### Scenario: Customer sees customer order navigation
- GIVEN an authenticated user has role `CLIENT`
- WHEN the shell renders navigation
- THEN it includes a customer order history entry
- AND hides operations/admin order management entries

### Requirement: Admin user-administration route access
The authenticated frontend shell SHALL expose user-administration routes only to authenticated sessions with role `ADMIN`.

#### Scenario: ADMIN reaches user-administration route
- **WHEN** an authenticated user with role `ADMIN` navigates to the user-administration route
- **THEN** the frontend renders the user-administration experience inside the authenticated shell

#### Scenario: Non-admin is denied user-administration route
- **WHEN** an authenticated user without role `ADMIN` navigates to the user-administration route
- **THEN** the frontend renders or redirects to an access-denied experience without rendering user-administration content

#### Scenario: Anonymous user is redirected from user-administration route
- **WHEN** an anonymous user navigates to the user-administration route
- **THEN** the frontend redirects the user to login without rendering protected user-administration content

### Requirement: Admin user-administration navigation
The authenticated frontend shell SHALL render a user-administration navigation entry only for sessions with role `ADMIN`.

#### Scenario: ADMIN sees user-administration navigation
- **WHEN** the authenticated shell renders navigation for a user with role `ADMIN`
- **THEN** it includes a user-administration navigation entry

#### Scenario: Customer-only user does not see user-administration navigation
- **WHEN** the authenticated shell renders navigation for a user with only role `CLIENT`
- **THEN** it hides the user-administration navigation entry

#### Scenario: Frontend navigation remains UX-only protection
- **WHEN** the user-administration navigation entry is hidden or shown
- **THEN** backend user-administration API calls still rely on backend RBAC responses as the authorization source of truth

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

