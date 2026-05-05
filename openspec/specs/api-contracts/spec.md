# api-contracts Specification

## Purpose
TBD - created by archiving change bootstrap-foundation. Update Purpose after archive.
## Requirements
### Requirement: Canonical error contract
The system SHALL return API errors using RFC 7807 Problem Details extended with stable `code`, UTC `timestamp` and optional field-level `errors`.

#### Scenario: Validation error response
- **WHEN** request validation fails
- **THEN** the API returns an error payload containing `type`, `title`, `status`, `detail`, `code`, `timestamp` and field-level `errors`

### Requirement: Canonical pagination contract
The system SHALL use `page` and `size` request parameters and return `items`, `total`, `page`, `size` and `pages` for paginated lists.

#### Scenario: Paginated list is requested
- **WHEN** a client requests a list endpoint with `page` and `size`
- **THEN** the API returns the requested page with pagination metadata

### Requirement: Money precision contract
The system SHALL represent persisted money as fixed-precision decimal values and SHALL NOT use floating point for monetary calculations.

#### Scenario: Order or payment amount is calculated
- **WHEN** backend code calculates an amount
- **THEN** it uses decimal precision and returns a stable two-decimal representation

### Requirement: UTC timestamp contract
The system SHALL persist and exchange timestamps as timezone-aware UTC ISO 8601 values.

#### Scenario: API returns an audited resource
- **WHEN** a resource includes timestamps
- **THEN** timestamp values are timezone-aware UTC ISO 8601 strings

### Requirement: API naming contract
The system SHALL use consistent route, JSON field and catalog code naming across backend and frontend.

#### Scenario: A new endpoint or schema is added
- **WHEN** a future change introduces API fields or catalog codes
- **THEN** names follow the canonical convention documented by the foundation

