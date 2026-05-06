## 1. Routing and Shell Structure

- [x] 1.1 Define route path constants and route access metadata for public, authenticated and role-restricted sections.
- [x] 1.2 Refactor `AppRouter` to compose public routes, authenticated routes and fallback/not-found behavior.
- [x] 1.3 Implement an authenticated shell layout with responsive navigation and logout affordance.
- [x] 1.4 Add placeholder protected pages for app/client, admin, stock and pedidos sections without implementing business modules.

## 2. Auth Guards and Session Bootstrap

- [x] 2.1 Implement anonymous-only, authenticated-only and role-restricted guard components at the app layer.
- [x] 2.2 Add a TanStack Query hook for `/api/v1/auth/me` using key `['auth', 'me']` and the existing `authClient`.
- [x] 2.3 Add a session bootstrap boundary that validates persisted tokens before protected content renders.
- [x] 2.4 Ensure invalid, expired or unrecoverable 401 sessions clear `auth-store` and redirect to login.

## 3. Auth UI Flows

- [x] 3.1 Add login page/form wired to `authClient.login` and `auth-store.setSession`.
- [x] 3.2 Add registration page/form wired to `authClient.register` and `auth-store.setSession`.
- [x] 3.3 Add logout flow that calls `authClient.logout` when possible, clears local session state and invalidates auth queries.
- [x] 3.4 Display canonical auth/validation errors without exposing sensitive token data.

## 4. Role-Aware Navigation and Error UX

- [x] 4.1 Implement role-filtered navigation derivation from route metadata and authenticated user roles.
- [x] 4.2 Add an access-denied page or route state for role guard failures.
- [x] 4.3 Add shared API/auth error presentation for global shell-level failures.
- [x] 4.4 Preserve accessible active-route, mobile navigation and keyboard interaction basics.

## 5. Verification

- [x] 5.1 Add tests for anonymous users being redirected away from protected routes.
- [x] 5.2 Add tests for authenticated users reaching protected routes after successful bootstrap.
- [x] 5.3 Add tests for role-allowed and role-denied route behavior.
- [x] 5.4 Add tests for login, registration error display and logout state clearing.
- [x] 5.5 Run frontend typecheck and targeted frontend tests; do not run production build.
