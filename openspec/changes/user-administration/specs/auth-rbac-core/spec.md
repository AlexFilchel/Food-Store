## ADDED Requirements

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
