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
The system SHALL restrict configured frontend routes by role codes from the authenticated user profile.

#### Scenario: User has allowed role
- **WHEN** an authenticated user has at least one role required by a role-restricted route
- **THEN** the frontend allows the route to render

#### Scenario: User lacks allowed role
- **WHEN** an authenticated user lacks all roles required by a role-restricted route
- **THEN** the frontend renders or redirects to an access-denied experience without rendering restricted content

#### Scenario: Role restriction is frontend-only UX protection
- **WHEN** a role-restricted frontend route is rendered
- **THEN** backend API calls still rely on backend RBAC responses as the authorization source of truth

### Requirement: Role-aware navigation
The system SHALL render navigation entries based on the authenticated user's role codes.

#### Scenario: Client user navigation
- **WHEN** an authenticated user has role `CLIENT`
- **THEN** the shell shows client-appropriate navigation entries and hides admin/operator-only entries

#### Scenario: Admin or operator navigation
- **WHEN** an authenticated user has role `ADMIN`, `STOCK` or `PEDIDOS`
- **THEN** the shell shows entries allowed for those roles and hides entries not allowed for the user's roles

#### Scenario: Navigation remains accessible
- **WHEN** navigation is rendered on desktop or mobile viewport sizes
- **THEN** the user can identify the active section, reach allowed routes and trigger logout using accessible controls

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

