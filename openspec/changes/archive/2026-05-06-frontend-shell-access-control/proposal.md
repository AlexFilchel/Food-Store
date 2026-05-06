## Why

The frontend currently has only a public home route, while `auth-rbac-core` already provides real login, refresh, logout and `/auth/me` contracts. Without a protected shell, the product cannot grow into customer/admin/operator experiences safely or consistently.

## What Changes

- Add an authenticated frontend shell with public and private route boundaries.
- Add route guards for anonymous-only, authenticated-only and role-restricted pages.
- Add session bootstrap from persisted auth state plus `/api/v1/auth/me` validation.
- Add token-expiration handling that clears invalid sessions and redirects users predictably.
- Add role-aware navigation placeholders for client, admin, stock and pedidos roles.
- Add global HTTP/auth error presentation for 401/403 and recoverable API failures.
- No backend API changes are introduced.

## Capabilities

### New Capabilities
- `frontend-shell-access-control`: Frontend routing shell, session restoration, protected route guards, role-aware navigation and global auth/API error handling.

### Modified Capabilities

None.

## Impact

- `frontend/src/app/router.tsx`: introduce route groups and guard composition.
- `frontend/src/app/providers/*`: bootstrap auth/session state and global error handling.
- `frontend/src/pages/*`: add login/register and protected placeholder pages.
- `frontend/src/widgets/*`: add application shell/navigation layout.
- `frontend/src/features/auth/*`: add auth forms, mutations and logout/session actions.
- `frontend/src/shared/api/*`: reuse auth client and interceptor behavior.
- `frontend/src/shared/stores/auth-store.ts`: extend persisted auth state only if needed for bootstrap/error metadata.
- Tests: add route guard, auth flow and shell behavior coverage.
