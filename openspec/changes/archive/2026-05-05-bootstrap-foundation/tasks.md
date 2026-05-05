## 1. Repository Foundation

- [x] 1.1 Add repository ignore rules for `.env`, virtual environments, dependency directories, caches and build outputs.
- [x] 1.2 Create or update safe `.env.example` files for backend and frontend with all required variables.
- [x] 1.3 Document local setup commands for backend, frontend, migrations and seed execution.
- [x] 1.4 Ensure `backend/`, `frontend/`, `docs/` and `openspec/` responsibilities are clear and preserved.

## 2. Backend Foundation

- [x] 2.1 Initialize FastAPI application structure under `backend/app/`.
- [x] 2.2 Add backend dependency and tooling files for runtime, tests and development.
- [x] 2.3 Implement centralized settings loading from environment variables.
- [x] 2.4 Configure FastAPI app startup, CORS, API prefix and generated docs.
- [x] 2.5 Add healthcheck endpoint returning HTTP 200 with explicit status payload.
- [x] 2.6 Add structured logging configuration without leaking sensitive values.
- [x] 2.7 Add canonical error handling for expected application and validation errors.
- [x] 2.8 Add lightweight `BaseRepository` and `UnitOfWork` foundation following `Router -> Service -> UnitOfWork -> Repository -> Model`.

## 3. Data Foundation

- [x] 3.1 Configure async PostgreSQL engine and session factory using `DATABASE_URL`.
- [x] 3.2 Configure Alembic for SQLModel/SQLAlchemy metadata discovery.
- [x] 3.3 Create foundational models for roles, order states, payment methods and bootstrap admin user support.
- [x] 3.4 Add reusable audit timestamp and soft delete primitives for future models.
- [x] 3.5 Create initial Alembic migration for foundational tables.
- [x] 3.6 Implement idempotent seed script for roles, order states, payment methods and bootstrap admin.
- [x] 3.7 Ensure seeded catalogs use stable numeric IDs plus unique semantic `code` values.

## 4. API Contracts

- [x] 4.1 Document and implement RFC 7807 extended error payload shape with `code`, `timestamp` and optional `errors[]`.
- [x] 4.2 Document pagination contract using `page`, `size`, `items`, `total`, `page`, `size` and `pages`.
- [x] 4.3 Add shared backend helpers or schemas for paginated responses.
- [x] 4.4 Establish UTC timezone-aware timestamp handling convention.
- [x] 4.5 Establish decimal money handling convention using `Decimal` and fixed-precision database columns.
- [x] 4.6 Document naming conventions for API routes, JSON fields and catalog codes.

## 5. Frontend Foundation

- [x] 5.1 Initialize React + TypeScript + Vite application under `frontend/`.
- [x] 5.2 Add frontend dependency and tooling files for development, typechecking and tests.
- [x] 5.3 Configure Tailwind CSS and global styles foundation.
- [x] 5.4 Create Feature-Sliced Design directories: `app`, `pages`, `widgets`, `features`, `entities` and `shared`.
- [x] 5.5 Configure app providers for routing and TanStack Query.
- [x] 5.6 Add shared HTTP client configured from `VITE_API_URL`.
- [x] 5.7 Add Zustand foundation for future client-only state without mixing server state.
- [x] 5.8 Add minimal landing or placeholder page proving the frontend boots correctly.

## 6. Verification

- [x] 6.1 Add backend tests for app startup or healthcheck.
- [x] 6.2 Add backend tests for canonical error payload shape.
- [x] 6.3 Add backend tests or script checks proving seed idempotency.
- [x] 6.4 Add frontend typecheck/test command and verify the scaffold compiles at type level.
- [x] 6.5 Verify migrations apply cleanly against an empty local database.
- [x] 6.6 Verify setup documentation matches actual commands and file paths.

## 7. OpenSpec Closure

- [x] 7.1 Update proposal/design/specs/tasks if implementation decisions change during apply.
- [x] 7.2 Confirm all specs scenarios are satisfied by implementation or documented as intentionally deferred.
- [x] 7.3 Prepare the change for verification and archive without marking business features as implemented.
