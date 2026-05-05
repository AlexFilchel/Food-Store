# project-foundation Specification

## Purpose
TBD - created by archiving change bootstrap-foundation. Update Purpose after archive.
## Requirements
### Requirement: Monorepo structure
The system SHALL provide a monorepo structure with separate `backend/`, `frontend/`, `docs/` and `openspec/` areas.

#### Scenario: Repository structure exists
- **WHEN** a developer inspects the repository root
- **THEN** the `backend/`, `frontend/`, `docs/` and `openspec/` directories exist with clear responsibilities

### Requirement: Environment examples
The system SHALL provide example environment files for backend and frontend without committing real secrets.

#### Scenario: Developer prepares local environment
- **WHEN** a developer copies `.env.example` files into local `.env` files
- **THEN** all required variables are discoverable with safe placeholder values

### Requirement: Setup documentation
The system SHALL document local setup commands for backend, frontend, database migrations and seed execution.

#### Scenario: Developer starts the project locally
- **WHEN** a developer follows setup documentation from a clean checkout
- **THEN** they can install dependencies, run migrations, seed data and start both applications

### Requirement: Repository safety rules
The system SHALL exclude local secrets, dependency folders, virtual environments, generated builds and cache artifacts from version control.

#### Scenario: Developer creates local artifacts
- **WHEN** local `.env`, virtualenv, `node_modules`, cache or build output files are created
- **THEN** they are ignored by repository rules and not intended for commit

