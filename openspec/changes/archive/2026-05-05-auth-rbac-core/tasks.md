## 1. Backend Data Model and Migration

- [x] 1.1 Review existing identity models, role seeds, security config and UoW extension points before coding.
- [x] 1.2 Add refresh token model with hashed token storage, user association, family/session metadata, expiration, revocation and usage timestamps.
- [x] 1.3 Create a new Alembic migration for refresh tokens without editing the archived bootstrap migration.
- [x] 1.4 Add refresh token repository methods for create, lookup by hash, revoke token, mark used and revoke token family/user tokens.
- [x] 1.5 Extend the Unit of Work to expose auth/identity repositories consistently with the backend foundation dependency flow.

## 2. Security Services

- [x] 2.1 Verify bcrypt password hashing uses cost factor >= 10 and centralize password verification helpers.
- [x] 2.2 Implement access JWT creation/validation with 30 minute expiration, HS256 signing and claims for user id, email and role codes.
- [x] 2.3 Implement opaque refresh token generation, hashing and secure comparison.
- [x] 2.4 Implement refresh rotation and replay detection service behavior.
- [x] 2.5 Implement canonical auth error codes for invalid credentials, invalid token, expired token, forbidden role, replay detection and rate limiting.

## 3. Auth API Endpoints

- [x] 3.1 Add Pydantic schemas for register, login, refresh, logout, token response and public user response.
- [x] 3.2 Implement `POST /api/v1/auth/register` with duplicate-email validation, bcrypt hashing, automatic `CLIENT` role assignment and token issuance.
- [x] 3.3 Implement `POST /api/v1/auth/login` with generic invalid-credential response and token issuance.
- [x] 3.4 Implement `POST /api/v1/auth/refresh` with rotation, expiration validation and replay handling.
- [x] 3.5 Implement `POST /api/v1/auth/logout` revoking the submitted refresh token and returning HTTP 204.
- [x] 3.6 Implement `GET /api/v1/auth/me` returning the authenticated user's public profile and role codes.
- [x] 3.7 Register the auth router under `/api/v1/auth` through the existing API router composition.

## 4. Authorization and Ownership Foundation

- [x] 4.1 Implement `get_current_user` dependency that validates bearer JWT, loads the active user and returns HTTP 401 for missing, invalid or expired tokens.
- [x] 4.2 Implement `require_role(allowed_roles)` dependency using role `code` values and returning HTTP 403 for insufficient roles.
- [x] 4.3 Implement a reusable ownership helper for owner-or-privileged-role authorization.
- [x] 4.4 Add example or internal tests proving ADMIN, STOCK, PEDIDOS and CLIENT role checks behave correctly.

## 5. Rate Limiting

- [x] 5.1 Decide and document whether auth rate limiting uses `slowapi` or a local adapter after verifying current dependencies.
- [x] 5.2 Implement failed-login rate limiting with 5 failed attempts per IP in 15 minutes.
- [x] 5.3 Return HTTP 429 with canonical error payload and `Retry-After` header when the limit is exceeded.
- [x] 5.4 Ensure successful login responses do not expose limiter counters or implementation details.

## 6. Frontend Contract Integration

- [x] 6.1 Wire existing shared HTTP client/auth store to real auth endpoint contracts where needed for vertical validation.
- [x] 6.2 Ensure frontend auth types match backend token and user response schemas.
- [x] 6.3 Keep full route guards, role-based navigation and shell layout out of scope for `frontend-shell-access-control`.

## 7. Tests and Verification

- [x] 7.1 Add backend tests for successful registration and automatic `CLIENT` role assignment.
- [x] 7.2 Add backend tests for duplicate email, weak password and response sanitization.
- [x] 7.3 Add backend tests for login success, invalid credentials and no user-enumeration behavior.
- [x] 7.4 Add backend tests for refresh success, token rotation, expired token and replay attack revocation.
- [x] 7.5 Add backend tests for logout revocation and `/auth/me` behavior.
- [x] 7.6 Add backend tests for 401 missing/invalid token and 403 insufficient role.
- [x] 7.7 Add backend tests for login rate limiting and `Retry-After` behavior.
- [x] 7.8 Run the relevant test suite for the changed backend/frontend scope without running a full build.

## 8. Documentation and OPSX Closure

- [x] 8.1 Update local setup/config documentation if new environment variables or dependencies are introduced.
- [x] 8.2 Ensure implemented endpoints, schemas, status codes and error codes match this change spec.
- [x] 8.3 Update this tasks checklist as implementation progresses.
- [x] 8.4 Prepare verification notes before archiving the change.
