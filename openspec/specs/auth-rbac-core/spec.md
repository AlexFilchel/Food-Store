# auth-rbac-core Specification

## Purpose
TBD - created by archiving change auth-rbac-core. Update Purpose after archive.
## Requirements
### Requirement: Customer registration
The system SHALL allow a new customer to register with first name, last name, email and password, storing the password only as a bcrypt hash and assigning the `CLIENT` role automatically.

#### Scenario: Successful customer registration
- **WHEN** an unregistered user submits valid registration data
- **THEN** the system creates an active user, assigns role `CLIENT`, returns HTTP 201 and returns an auth token response

#### Scenario: Duplicate email registration
- **WHEN** a user attempts to register with an email already assigned to an existing user
- **THEN** the system rejects the request with the canonical error contract and a stable duplicate-email code

#### Scenario: Weak password registration
- **WHEN** a registration request contains a password shorter than the configured minimum
- **THEN** the system rejects the request with field-level validation errors in the canonical error contract

#### Scenario: Role cannot be supplied by client
- **WHEN** a registration request includes role or permission fields
- **THEN** the system ignores or rejects those fields and still only assigns the `CLIENT` role

### Requirement: User login
The system SHALL authenticate users with email and password at `POST /api/v1/auth/login`, returning an access token and refresh token when credentials are valid.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** the system returns HTTP 200 with `access_token`, `refresh_token`, `token_type` equal to `bearer`, and `expires_in`

#### Scenario: Invalid credentials
- **WHEN** a user submits an unknown email or an incorrect password
- **THEN** the system returns HTTP 401 using the same generic canonical error for both cases

#### Scenario: Login token claims
- **WHEN** the system issues an access token
- **THEN** the JWT contains user id, email, role codes and expiration without exposing password hash or sensitive internals

### Requirement: Authentication rate limiting
The system SHALL rate-limit failed login attempts by source IP to a maximum of 5 failed attempts within 15 minutes.

#### Scenario: Login rate limit exceeded
- **WHEN** the same source IP exceeds 5 failed login attempts within 15 minutes
- **THEN** the login endpoint returns HTTP 429 with the canonical error contract and a `Retry-After` header

#### Scenario: Successful login does not leak rate-limit internals
- **WHEN** a user logs in successfully
- **THEN** the system returns the token response without exposing counters, internal limiter keys or implementation details

### Requirement: Refresh token persistence
The system SHALL issue refresh tokens as opaque client tokens and persist only hashed refresh token values with expiration, revocation and rotation metadata.

#### Scenario: Refresh token is stored securely
- **WHEN** a refresh token is issued
- **THEN** the database stores a hash of the token, expiration timestamp and user association, but not the plain token value

#### Scenario: Refresh token expires
- **WHEN** an expired refresh token is submitted
- **THEN** the system returns HTTP 401 using the canonical error contract and does not issue new tokens

### Requirement: Refresh token rotation
The system SHALL rotate refresh tokens on every successful refresh request at `POST /api/v1/auth/refresh`.

#### Scenario: Successful refresh rotation
- **WHEN** a valid non-expired and non-revoked refresh token is submitted
- **THEN** the system revokes or marks the old refresh token as used and returns a new access token and a new refresh token

#### Scenario: Refresh token replay attack
- **WHEN** a refresh token that was already used or revoked is submitted again
- **THEN** the system treats it as replay, revokes the active token family or user tokens, and returns HTTP 401 with a stable replay-detected error code

### Requirement: Logout
The system SHALL allow an authenticated user to log out through `POST /api/v1/auth/logout` by revoking the submitted refresh token.

#### Scenario: Successful logout
- **WHEN** an authenticated user submits their active refresh token to logout
- **THEN** the system revokes that refresh token and returns HTTP 204

#### Scenario: Access token remains stateless after logout
- **WHEN** a user logs out
- **THEN** previously issued access tokens are not stored server-side and remain valid only until their natural expiration

### Requirement: Current authenticated user
The system SHALL expose `GET /api/v1/auth/me` to return the current authenticated user's public profile and role codes.

#### Scenario: Current user is returned
- **WHEN** a request includes a valid bearer access token for an active user
- **THEN** the system returns HTTP 200 with user id, first name, last name, email, role codes and creation timestamp

#### Scenario: Missing or invalid token for current user
- **WHEN** a request to `/api/v1/auth/me` has no bearer token, an invalid token or an expired token
- **THEN** the system returns HTTP 401 using the canonical error contract

### Requirement: Backend RBAC dependencies
The system SHALL provide reusable backend authorization dependencies to require an authenticated user and one or more allowed role codes.

#### Scenario: Missing authentication on protected endpoint
- **WHEN** a protected endpoint is called without a valid bearer token
- **THEN** the dependency rejects the request with HTTP 401 using the canonical error contract

#### Scenario: Insufficient role on protected endpoint
- **WHEN** an authenticated user without an allowed role calls a restricted endpoint
- **THEN** the dependency rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Allowed role on protected endpoint
- **WHEN** an authenticated user has at least one allowed role code
- **THEN** the dependency allows the request to reach the endpoint handler

### Requirement: Basic ownership authorization
The system SHALL provide a reusable ownership authorization helper that allows access when the authenticated user owns a resource or has an explicitly allowed privileged role.

#### Scenario: Owner accesses own resource
- **WHEN** an authenticated user requests a resource whose owner id matches their user id
- **THEN** the ownership helper authorizes the operation

#### Scenario: Non-owner without privileged role accesses resource
- **WHEN** an authenticated user requests a resource owned by another user and lacks an allowed privileged role
- **THEN** the ownership helper rejects the operation with HTTP 403 using the canonical error contract

### Requirement: Auth API contracts
The system SHALL implement auth schemas and errors using the project canonical API contracts.

#### Scenario: Auth response excludes sensitive fields
- **WHEN** any auth endpoint returns a user payload
- **THEN** the response excludes password hash, refresh token hash and internal security metadata

#### Scenario: Auth errors use canonical format
- **WHEN** an auth endpoint rejects a request due to validation, authentication, authorization, expiration, replay or rate limiting
- **THEN** the response follows RFC 7807 extended with stable `code`, UTC `timestamp` and field-level `errors` when applicable

### Requirement: Administrative identity authorization
The system SHALL restrict user-administration backend operations to authenticated users with role `ADMIN` and SHALL keep backend RBAC as the authorization source of truth.

#### Scenario: ADMIN accesses identity administration
- **WHEN** an authenticated user with role `ADMIN` calls a user-administration endpoint
- **THEN** the backend authorization dependency allows the request to reach the endpoint handler

#### Scenario: Non-admin is denied identity administration
- **WHEN** an authenticated user without role `ADMIN` calls a user-administration endpoint
- **THEN** the backend rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Anonymous user is denied identity administration
- **WHEN** a request without a valid bearer token calls a user-administration endpoint
- **THEN** the backend rejects the request with HTTP 401 using the canonical error contract

### Requirement: Administrative user response safety
The system SHALL ensure administrative user responses expose only safe identity and lifecycle fields and never expose authentication secrets.

#### Scenario: Admin response excludes password internals
- **WHEN** a user-administration endpoint returns a user payload
- **THEN** the response excludes password hash fields and any plaintext credential material

#### Scenario: Admin response excludes token internals
- **WHEN** a user-administration endpoint returns a user payload
- **THEN** the response excludes refresh-token hashes, reset-token hashes, token family metadata, and internal security implementation details

