# customer-profile Specification

## Purpose
TBD - created by archiving change customer-profile. Update Purpose after archive.
## Requirements
### Requirement: Authenticated customer profile retrieval
The system SHALL allow an authenticated user to retrieve their own customer profile without exposing sensitive security data.

#### Scenario: Customer views own profile
- **WHEN** an authenticated active user requests their customer profile
- **THEN** the API returns the user's id, first name, last name, email, role codes and creation timestamp

#### Scenario: Anonymous profile request is rejected
- **WHEN** a request without a valid bearer token requests the customer profile
- **THEN** the API returns HTTP 401 using the canonical error contract

#### Scenario: Profile response excludes sensitive data
- **WHEN** the customer profile API returns a user payload
- **THEN** the response excludes password hash, refresh token hash and internal security metadata

### Requirement: Authenticated customer profile update
The system SHALL allow an authenticated user to update their own editable profile fields while preserving ownership and canonical validation.

#### Scenario: Customer updates own profile
- **WHEN** an authenticated active user submits valid first name, last name and email values for their own profile
- **THEN** the API updates the current user's record, recalculates full name and returns the updated public profile

#### Scenario: Profile update cannot target another user
- **WHEN** a customer updates their profile
- **THEN** the backend derives the target user from the bearer token and does not accept a client-supplied user id

#### Scenario: Duplicate profile email is rejected
- **WHEN** an authenticated user submits an email already assigned to another active non-deleted user
- **THEN** the API rejects the request with the canonical error contract and a stable duplicate-email code

#### Scenario: Invalid profile payload is rejected
- **WHEN** a customer submits invalid profile fields such as blank names or malformed email
- **THEN** the API rejects the request with field-level validation errors in the canonical error contract

### Requirement: Authenticated password change
The system SHALL allow an authenticated user to change their own password after proving knowledge of the current password.

#### Scenario: Customer changes password successfully
- **WHEN** an authenticated active user submits their correct current password and a valid new password
- **THEN** the API stores only the new password hash and returns HTTP 204 without exposing password data

#### Scenario: Incorrect current password is rejected
- **WHEN** an authenticated user submits an incorrect current password for password change
- **THEN** the API rejects the request with HTTP 401 using the canonical error contract and a stable invalid-current-password code

#### Scenario: Weak new password is rejected
- **WHEN** an authenticated user submits a new password shorter than the configured minimum or exceeding bcrypt limits
- **THEN** the API rejects the request with field-level validation errors in the canonical error contract

#### Scenario: New password works for future login
- **WHEN** the password change succeeds and the user later logs in with the new password
- **THEN** the login succeeds and the previous password no longer authenticates

### Requirement: Customer profile frontend
The system SHALL provide a protected frontend profile experience for authenticated customers.

#### Scenario: Authenticated customer opens profile page
- **WHEN** an authenticated customer navigates to the client application area
- **THEN** the frontend renders profile information and editable profile controls inside the authenticated shell

#### Scenario: Anonymous user cannot open profile page
- **WHEN** an anonymous user navigates to the protected customer profile route
- **THEN** the frontend redirects to login and does not render profile content

#### Scenario: Customer saves profile changes
- **WHEN** the customer submits valid profile edits
- **THEN** the frontend calls the profile update API, shows success feedback and updates the stored authenticated user data

#### Scenario: Customer sees profile validation errors
- **WHEN** the backend rejects profile edits with canonical validation or duplicate-email errors
- **THEN** the frontend displays a useful error without losing the entered form data

### Requirement: Customer password change frontend
The system SHALL provide a protected frontend flow for changing the authenticated customer's password.

#### Scenario: Customer submits password change
- **WHEN** the customer submits current password, new password and confirmation with valid values
- **THEN** the frontend calls the password change API, clears password fields on success and shows success feedback

#### Scenario: Password confirmation mismatch is blocked client-side
- **WHEN** the new password and confirmation do not match
- **THEN** the frontend blocks submission and displays a clear validation message

#### Scenario: Password change API error is displayed safely
- **WHEN** the backend rejects password change due to incorrect current password or validation errors
- **THEN** the frontend displays a useful error without exposing tokens, hashes or internal security metadata

