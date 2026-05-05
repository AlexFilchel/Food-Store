# frontend-foundation Specification

## Purpose
TBD - created by archiving change bootstrap-foundation. Update Purpose after archive.
## Requirements
### Requirement: React application bootstrap
The system SHALL provide a React + TypeScript + Vite frontend application that starts locally.

#### Scenario: Frontend starts successfully
- **WHEN** a developer runs the documented frontend dev command
- **THEN** the application starts without TypeScript or import errors and serves a local page

### Requirement: Feature-Sliced Design structure
The system SHALL establish frontend layers `app`, `pages`, `widgets`, `features`, `entities` and `shared`.

#### Scenario: Developer adds frontend code
- **WHEN** new frontend functionality is added
- **THEN** it is placed according to Feature-Sliced Design layer responsibilities

### Requirement: Server state foundation
The system SHALL configure TanStack Query as the foundation for remote server state.

#### Scenario: Frontend needs remote data
- **WHEN** a future feature fetches backend data
- **THEN** it uses TanStack Query instead of duplicating server state in client stores

### Requirement: Client state foundation
The system SHALL configure Zustand as the foundation for local client state.

#### Scenario: Frontend needs local UI or client-only state
- **WHEN** a future feature stores cart, UI preferences or transient local state
- **THEN** it uses Zustand or local component state rather than TanStack Query

### Requirement: HTTP client foundation
The system SHALL provide a shared HTTP client configured from frontend environment variables.

#### Scenario: Frontend calls the backend API
- **WHEN** a frontend module performs an API request
- **THEN** it uses the shared HTTP client with the configured API base URL

