## ADDED Requirements

### Requirement: Admin can view effective system configuration
The system SHALL allow authenticated `ADMIN` users to view the effective system configuration, including each allowed key, current effective value, default value, type, category, editability, visibility, validation metadata, description, version, and last update metadata when available.

#### Scenario: Admin lists configuration
- **WHEN** an authenticated `ADMIN` requests the administrative configuration endpoint
- **THEN** the system returns all configured keys from the backend registry with effective values resolved from database override or default value

#### Scenario: Non-admin cannot list configuration
- **WHEN** an authenticated non-`ADMIN` user requests the administrative configuration endpoint
- **THEN** the system returns a canonical `403` error and does not expose configuration metadata

#### Scenario: Anonymous user cannot list configuration
- **WHEN** an unauthenticated request reaches the administrative configuration endpoint
- **THEN** the system returns a canonical `401` error and does not expose configuration metadata

### Requirement: Configuration keys are whitelisted and typed
The system SHALL define editable configuration keys through a backend registry with explicit type, default value, category, visibility, validation rules, editability, and sensitivity metadata. The system MUST reject any attempt to read or mutate undeclared keys through administrative update operations.

#### Scenario: Unknown key is rejected
- **WHEN** an `ADMIN` submits an update containing a key not declared in the backend registry
- **THEN** the system rejects the request with a validation error identifying the unknown key

#### Scenario: Registered defaults are returned without overrides
- **WHEN** a registered key has no stored override
- **THEN** the system returns the registry default as the effective value and marks the value as default-backed

### Requirement: Admin can update editable configuration atomically
The system SHALL allow authenticated `ADMIN` users to update one or more editable configuration keys in a single atomic operation. The system MUST validate all submitted values before persisting any change.

#### Scenario: Valid multi-key update succeeds
- **WHEN** an `ADMIN` submits valid values for multiple editable keys
- **THEN** the system persists all changes in one transaction and returns the updated effective configuration

#### Scenario: Invalid multi-key update rolls back all changes
- **WHEN** an `ADMIN` submits multiple changes and at least one value violates its validation rule
- **THEN** the system rejects the entire request and none of the submitted values are persisted

#### Scenario: Read-only key update is rejected
- **WHEN** an `ADMIN` submits an update for a registered but non-editable key
- **THEN** the system rejects the request with a validation error identifying the read-only key

### Requirement: Configuration values are validated by type and domain rules
The system SHALL validate configuration values according to their declared type and domain constraints before persistence. The initial registry MUST include validation for timezone, boolean, integer range, nullable public text fields, and operational order limits.

#### Scenario: Invalid timezone is rejected
- **WHEN** an `ADMIN` submits `business.timezone` with a non-IANA timezone value
- **THEN** the system rejects the request with a field-level validation error

#### Scenario: Order limits outside safe range are rejected
- **WHEN** an `ADMIN` submits `orders.max_items_per_order` or `orders.max_quantity_per_item` outside the configured safe range
- **THEN** the system rejects the request with a field-level validation error

#### Scenario: Nullable public contact values are accepted
- **WHEN** an `ADMIN` submits `null` or an empty value for optional public contact fields
- **THEN** the system stores the normalized nullable value according to backend rules

### Requirement: Configuration changes are audited
The system SHALL record an append-only audit entry for each persisted configuration key change, including key, old value, new value, changing user, timestamp, optional reason, and request correlation metadata when available.

#### Scenario: Audit entries are created for changed keys
- **WHEN** an `ADMIN` successfully updates three configuration keys
- **THEN** the system creates three audit entries, one per changed key

#### Scenario: No audit entry for rejected update
- **WHEN** a configuration update fails validation and rolls back
- **THEN** the system creates no configuration audit entries for the rejected update

#### Scenario: No-op values do not create fake changes
- **WHEN** an `ADMIN` submits the same effective value already stored for a key
- **THEN** the system does not create a misleading audit entry for that unchanged key

### Requirement: Public configuration exposes only safe keys
The system SHALL expose a public configuration endpoint that returns only keys explicitly marked as public and non-sensitive. The endpoint MUST NOT expose admin-only metadata, audit history, internal operational flags, secrets, or undeclared keys.

#### Scenario: Public endpoint returns public store data
- **WHEN** any client requests public system configuration
- **THEN** the system returns public non-sensitive values such as store public name and public contact data

#### Scenario: Public endpoint hides admin-only operational keys
- **WHEN** any client requests public system configuration
- **THEN** the system does not return admin-only keys such as internal order limits or payment expiration windows unless explicitly marked public-safe

### Requirement: Ordering availability can be controlled safely
The system SHALL support a `store.ordering_enabled` boolean configuration that allows administrators to pause creation of new orders while keeping catalog browsing, login, existing order tracking, and administrative operations available.

#### Scenario: Ordering enabled allows normal order creation
- **WHEN** `store.ordering_enabled` is `true` and a valid customer submits an order through the existing order creation flow
- **THEN** the system allows the flow to proceed to existing preflight and order creation validation

#### Scenario: Ordering disabled blocks new order creation
- **WHEN** `store.ordering_enabled` is `false` and a customer attempts to create a new order
- **THEN** the system rejects new order creation with a stable business error indicating ordering is temporarily disabled

#### Scenario: Ordering disabled does not block tracking existing orders
- **WHEN** `store.ordering_enabled` is `false` and a customer views existing orders
- **THEN** the system continues to allow read-only order tracking

### Requirement: Business timezone is configurable for operational consumers
The system SHALL support a `business.timezone` configuration using an IANA timezone string. Operational consumers such as dashboard metrics SHALL use the effective timezone as the default when a request does not provide an explicit timezone override.

#### Scenario: Metrics use configured timezone by default
- **WHEN** `business.timezone` is set to `America/Argentina/Buenos_Aires` and an admin requests dashboard metrics without a timezone parameter
- **THEN** the system groups and formats time-based metrics using `America/Argentina/Buenos_Aires`

#### Scenario: Explicit request timezone remains authoritative when supported
- **WHEN** an admin requests metrics with a valid explicit timezone parameter
- **THEN** the system uses the explicit request timezone for that request without mutating global configuration

### Requirement: Admin UI supports configuration editing
The system SHALL provide an administrative UI page for `ADMIN` users to view and edit system configuration grouped by category, with typed controls, validation feedback, loading/error states, and clear save/cancel behavior.

#### Scenario: Admin edits configuration from UI
- **WHEN** an `ADMIN` opens the system configuration page and changes valid editable fields
- **THEN** the UI submits the update, shows success feedback, and refreshes the effective configuration

#### Scenario: UI shows backend validation errors
- **WHEN** the backend rejects a configuration update with field-level errors
- **THEN** the UI displays user-safe validation messages next to the affected fields without losing the entered values

#### Scenario: Non-admin cannot access configuration UI
- **WHEN** a non-`ADMIN` user navigates to the system configuration route
- **THEN** route protection prevents access according to the existing frontend access-control patterns

### Requirement: Configuration supports optimistic concurrency
The system SHALL include version or last-updated metadata with administrative configuration reads and SHALL detect stale update attempts when the client provides an expected version for a key.

#### Scenario: Stale update is rejected
- **WHEN** two admins load the same configuration version and one admin saves a change first
- **THEN** a later save from the stale version is rejected with a conflict error instead of overwriting silently

#### Scenario: Fresh update succeeds
- **WHEN** an admin submits an update with the current expected version
- **THEN** the system persists the update if all values are valid
