# user-administration Specification

## Purpose
TBD - created by archiving change user-administration. Update Purpose after archive.
## Requirements
### Requirement: Admin user listing
The system SHALL allow an authenticated ADMIN user to retrieve a paginated list of users with filtering by search text, role code, and active status.

#### Scenario: ADMIN lists users
- **WHEN** an authenticated user with role `ADMIN` requests the user administration list
- **THEN** the API returns HTTP 200 with canonical pagination metadata and user summaries containing id, first name, last name, email, active status, role codes, and UTC audit timestamps

#### Scenario: User list filters are applied
- **WHEN** an ADMIN requests users with search, role, or active-status filters
- **THEN** the API returns only users matching the supplied filters while preserving canonical pagination fields

#### Scenario: Non-admin cannot list users
- **WHEN** an authenticated user without role `ADMIN` requests the user administration list
- **THEN** the API rejects the request with HTTP 403 using the canonical error contract

### Requirement: Admin user detail
The system SHALL allow an authenticated ADMIN user to retrieve safe administrative detail for a single user.

#### Scenario: ADMIN retrieves user detail
- **WHEN** an ADMIN requests an existing user by id
- **THEN** the API returns HTTP 200 with safe profile fields, role codes, lifecycle status, and UTC audit timestamps

#### Scenario: User detail excludes secrets
- **WHEN** any user administration detail response is returned
- **THEN** the response excludes password hashes, refresh-token hashes, reset-token hashes, and internal security metadata

#### Scenario: Missing user detail
- **WHEN** an ADMIN requests a user id that does not exist or is not visible to administration
- **THEN** the API returns HTTP 404 using the canonical error contract

### Requirement: Admin user creation
The system SHALL allow an authenticated ADMIN user to create staff or customer user accounts with validated profile data, password handling, and role assignment.

#### Scenario: ADMIN creates user
- **WHEN** an ADMIN submits valid first name, last name, email, password or reset strategy, and one or more allowed role codes
- **THEN** the API creates an active user, stores only a bcrypt password hash when a password is supplied, assigns the requested roles, and returns HTTP 201 with a safe user detail response

#### Scenario: Duplicate email on admin create
- **WHEN** an ADMIN attempts to create a user with an email already assigned to an existing non-deleted user
- **THEN** the API rejects the request with the canonical error contract and a stable duplicate-email code

#### Scenario: Invalid role on admin create
- **WHEN** an ADMIN submits an unknown or disallowed role code during user creation
- **THEN** the API rejects the request with field-level validation errors in the canonical error contract

### Requirement: Admin user profile and role updates
The system SHALL allow an authenticated ADMIN user to update another user's editable profile fields and role assignments without exposing or mutating secrets directly.

#### Scenario: ADMIN updates user profile
- **WHEN** an ADMIN submits valid changes to editable profile fields for an existing user
- **THEN** the API persists the changes and returns an updated safe user detail response

#### Scenario: ADMIN updates user roles
- **WHEN** an ADMIN submits a valid replacement set of role codes for an existing user
- **THEN** the API replaces that user's role assignments and returns the updated role codes

#### Scenario: Last admin cannot be removed
- **WHEN** an ADMIN role update would leave the system with no active ADMIN user
- **THEN** the API rejects the request with HTTP 409 using the canonical error contract

### Requirement: Admin user activation lifecycle
The system SHALL allow an authenticated ADMIN user to deactivate and reactivate user accounts while preserving historical data.

#### Scenario: ADMIN deactivates user
- **WHEN** an ADMIN deactivates an active user account that is safe to deactivate
- **THEN** the API marks the user inactive and future authentication for that user is rejected

#### Scenario: ADMIN reactivates user
- **WHEN** an ADMIN reactivates an inactive user account
- **THEN** the API marks the user active and the account can authenticate if credentials remain valid

#### Scenario: Last active admin cannot be deactivated
- **WHEN** a deactivation request would leave the system with no active ADMIN user
- **THEN** the API rejects the request with HTTP 409 using the canonical error contract

### Requirement: Admin password reset
The system SHALL allow an authenticated ADMIN user to initiate a password reset or set a temporary password for a user without exposing stored secrets.

#### Scenario: ADMIN resets password
- **WHEN** an ADMIN submits a valid password reset action for an existing user
- **THEN** the API applies the configured reset semantics and returns a safe confirmation without exposing password hashes or reset-token hashes

#### Scenario: Reset password validation fails
- **WHEN** a reset request includes a weak password or otherwise invalid reset payload
- **THEN** the API rejects the request with field-level validation errors in the canonical error contract

#### Scenario: Reset invalidates old credentials when password is changed
- **WHEN** an ADMIN sets a new password for a user
- **THEN** the user can authenticate with the new password and cannot authenticate with the old password

### Requirement: Admin user-management frontend
The system SHALL provide an ADMIN-only frontend user-administration experience inside the authenticated shell.

#### Scenario: ADMIN reaches user administration page
- **WHEN** an authenticated user with role `ADMIN` navigates to the user administration route
- **THEN** the frontend renders the user list experience inside the authenticated shell

#### Scenario: User management search and filters
- **WHEN** an ADMIN enters search text or changes role/status filters
- **THEN** the frontend requests the filtered paginated user list and renders loading, empty, success, and error states without crashing

#### Scenario: User management mutations refresh state
- **WHEN** an ADMIN creates, updates, activates, deactivates, changes roles, or resets a password for a user successfully
- **THEN** the frontend invalidates or refreshes the relevant user administration queries and shows user-visible feedback

#### Scenario: Frontend handles authorization failure
- **WHEN** a user-management API request returns HTTP 401 or HTTP 403
- **THEN** the frontend clears or preserves session according to existing auth rules and presents access-denied or global feedback without exposing sensitive data

