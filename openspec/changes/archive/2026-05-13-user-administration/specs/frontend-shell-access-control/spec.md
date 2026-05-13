## ADDED Requirements

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
