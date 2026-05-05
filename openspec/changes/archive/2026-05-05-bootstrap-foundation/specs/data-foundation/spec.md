## ADDED Requirements

### Requirement: Async database foundation
The system SHALL configure asynchronous PostgreSQL access through SQLModel/SQLAlchemy Async.

#### Scenario: Backend opens a database session
- **WHEN** backend code requests a database session
- **THEN** it receives an async session configured from `DATABASE_URL`

### Requirement: Alembic migration foundation
The system SHALL provide Alembic configuration and an initial migration for foundational tables.

#### Scenario: Developer applies migrations
- **WHEN** a developer runs the documented Alembic upgrade command against an empty database
- **THEN** foundational tables are created without errors

### Requirement: Foundational catalog seeds
The system SHALL seed roles, order states, payment methods and bootstrap admin data idempotently.

#### Scenario: Seed is executed multiple times
- **WHEN** the seed command is executed more than once
- **THEN** it does not duplicate roles, states, payment methods or the bootstrap admin user

### Requirement: Stable catalog identifiers
The system SHALL store stable numeric IDs and unique semantic `code` values for seeded catalogs.

#### Scenario: Business code references a seeded catalog
- **WHEN** application logic or API responses identify roles, states or payment methods
- **THEN** they use stable semantic `code` values while preserving stable IDs in persistence

### Requirement: Audit and soft delete primitives
The system SHALL establish reusable audit timestamp and soft delete conventions for future models.

#### Scenario: A model supports audit and soft delete
- **WHEN** a future table uses the shared conventions
- **THEN** it has creation/update timestamps and nullable deletion timestamp behavior consistent with project rules
