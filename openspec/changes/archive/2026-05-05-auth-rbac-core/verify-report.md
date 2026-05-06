## Verification Report: auth-rbac-core

**Date**: 2026-05-05
**Tasks**: 40/40 complete

### Test Results

Backend targeted tests were run from `backend/`:

```text
pytest tests/test_auth.py tests/test_migrations.py tests/test_seed.py tests/test_errors.py

collected 15 items

tests\test_auth.py ............                                          [ 80%]
tests\test_migrations.py .                                               [ 86%]
tests\test_seed.py .                                                     [ 93%]
tests\test_errors.py .                                                   [100%]

============================= 15 passed in 12.97s =============================
```

Frontend dependencies were installed from the lockfile with `npm ci`, then typecheck was run from `frontend/`:

```text
npm run typecheck

> food-store-frontend@0.1.0 typecheck
> tsc --noEmit
```

The frontend typecheck completed successfully.

### Fixes Applied During Verify

- Added `pythonpath = ["."]` to `backend/pyproject.toml` so the direct `pytest` executable resolves the local `app` package consistently on Windows.
- Added test fixture cleanup in `backend/tests/conftest.py` to dispose the cached async engine and clear caches after tests, preventing pytest from hanging after reporting results.

### Spec Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Customer registration | PASS | `POST /api/v1/auth/register` creates users, hashes passwords, assigns `CLIENT`, returns HTTP 201 and token response. Duplicate email and weak password cases are covered by tests. Extra role fields are ignored by schema config. |
| User login | PASS | `POST /api/v1/auth/login` returns bearer token response, JWT contains `sub`, `email`, `roles`, and invalid credentials return generic `AUTH_INVALID_CREDENTIALS`. |
| Authentication rate limiting | PASS | Local login limiter enforces 5 failed attempts / 15 minutes by IP and returns HTTP 429 with `Retry-After` and canonical `AUTH_RATE_LIMITED`. |
| Refresh token persistence | PASS | Refresh tokens are generated opaquely and only `token_hash` is stored with `expires_at`, `family_id`, `revoked_at`, `used_at`, IP and user-agent metadata. |
| Refresh token rotation | PASS | Refresh marks previous token as used, emits a new refresh token, and replay returns `AUTH_REFRESH_REPLAY_DETECTED` while revoking the token family. |
| Logout | PASS | `POST /api/v1/auth/logout` revokes the submitted refresh token and returns HTTP 204. Access tokens remain stateless until expiration. |
| Current authenticated user | PASS | `GET /api/v1/auth/me` returns public user fields and roles for valid bearer tokens; missing/invalid tokens return HTTP 401. |
| Backend RBAC dependencies | PASS | `get_current_user` and `require_role(...)` are implemented as reusable FastAPI dependencies and tested for ADMIN/STOCK/PEDIDOS/CLIENT behavior. |
| Basic ownership authorization | PASS | `enforce_owner_or_roles` / ownership service authorizes owner or privileged role and rejects non-owner without privileged role with HTTP 403. |
| Auth API contracts | PASS | Auth schemas exclude password/token hashes; auth errors use stable codes and canonical RFC 7807-style problem payloads through existing error handling. |

### Design Coherence

- Refresh token opaco con hash persistido: FOLLOWED — client receives opaque token; DB stores SHA-256 hash only.
- Rotación obligatoria y familia de refresh tokens: FOLLOWED — refresh marks the prior token as used and creates a new token in the same family; replay revokes family.
- Access JWT stateless de corta vida: FOLLOWED — HS256 access token with `sub`, `email`, `roles`, and configured 30-minute expiration.
- RBAC as reusable dependencies: FOLLOWED — `get_current_user` and `require_role(...)` are centralized in `auth/dependencies.py`.
- Ownership básico reusable: FOLLOWED — helper/service checks owner-or-role without domain-specific ownership logic.
- Rate limiting fallback explícito: FOLLOWED — implemented as local in-memory adapter; known tradeoff remains documented.
- Canonical API contracts: FOLLOWED — endpoints live under `/api/v1/auth`; auth errors expose stable codes and status codes.
- Migration plan: FOLLOWED — new Alembic migration `20260505_0002_auth_rbac_core.py` added without editing the archived bootstrap migration.

### Summary

- CRITICAL: None.
- WARNING: The login rate limiter is in-memory. This matches the design fallback, but it is not horizontally scalable and should be replaced by Redis/shared storage before multi-instance deployment.
- SUGGESTION: Consider adding a future security hardening change for httpOnly-cookie refresh transport, email verification and password recovery.

**Verdict**: READY FOR ARCHIVE
