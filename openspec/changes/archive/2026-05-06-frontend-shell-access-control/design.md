## Context

`bootstrap-foundation` established React 18 + TypeScript + Vite, Feature-Sliced Design, TanStack Query, Zustand and a shared Axios client. `auth-rbac-core` added backend auth/RBAC and frontend primitives (`auth-store`, `auth-client`, refresh interceptor), but `frontend/src/app/router.tsx` still exposes only `/` and no route protection.

## Goals / Non-Goals

**Goals:**
- Provide public, authenticated and role-restricted route boundaries.
- Restore persisted sessions through `/api/v1/auth/me` before rendering protected content.
- Centralize logout, expired-session handling and 401/403 UX.
- Introduce a responsive app shell with role-aware navigation placeholders.
- Preserve Feature-Sliced boundaries and avoid duplicating server state in Zustand.

**Non-Goals:**
- No backend endpoint, JWT or RBAC changes.
- No full business modules such as category/product/order management.
- No httpOnly-cookie migration; token transport remains as implemented by `auth-rbac-core`.
- No visual design system overhaul beyond shell-level reusable UI.

## Decisions

### 1. Route guards live in the app layer
Use app-level guard components/loaders around React Router route groups rather than scattering auth checks inside pages.

- **Why:** route access is cross-cutting application composition, not page business logic.
- **Alternative considered:** page-level checks. Rejected because every page would duplicate redirects and role handling.

### 2. Zustand stores client session tokens, TanStack Query owns `/auth/me`
Keep `accessToken`, `refreshToken` and minimal persisted user in `auth-store`, but validate/refresh current user through a TanStack Query hook keyed as `['auth', 'me']`.

- **Why:** tokens are client-only state; current user profile is server state and benefits from query invalidation/retry/error semantics.
- **Alternative considered:** store all user freshness in Zustand. Rejected because it duplicates server state and can drift from backend activation/role changes.

### 3. Session bootstrap gates protected rendering
Introduce an auth bootstrap boundary that checks persisted token presence, calls `/auth/me` when needed, and renders a loading/fallback state before protected children.

- **Why:** protected pages must not flicker unauthorized content or navigate before auth state is known.
- **Alternative considered:** optimistic render from persisted user. Rejected because stale persisted roles could expose wrong navigation/actions.

### 4. Role navigation is declarative metadata
Represent navigation items as route metadata with allowed roles and derive visible links from the authenticated user roles.

- **Why:** keeps navigation and guard policy aligned and easy to extend for future changes.
- **Alternative considered:** hard-coded conditional JSX per role. Rejected because it scales poorly as modules are added.

### 5. Error handling remains global but non-invasive
Axios continues to clear session on unrecoverable 401. UI-level auth errors are surfaced through route redirects and a shared error display/toast-style region, without forcing every feature to catch auth errors manually.

- **Why:** auth expiration is a shell concern; domain-specific errors still belong to feature forms/pages.
- **Alternative considered:** handle all errors in interceptors. Rejected because it hides feature-specific validation behavior.

## Risks / Trade-offs

- Persisted tokens in localStorage remain vulnerable to XSS → mitigate with no unsafe HTML, short access token lifetime, and document future httpOnly-cookie hardening.
- Refresh interceptor and bootstrap query can race → guard with single retry semantics and ensure failed refresh clears state once.
- Role-aware navigation can be mistaken for authorization → specs/tasks must keep backend RBAC as source of truth; frontend guards are UX protection only.
- Route restructuring can break imports → keep changes inside Feature-Sliced boundaries and verify with typecheck/tests.

## Migration Plan

1. Add route constants, guard components and shell layout without removing existing home page behavior.
2. Add auth pages/forms and protected placeholder pages.
3. Wire session bootstrap and role-aware navigation.
4. Add tests for anonymous, authenticated, role-allowed and role-denied navigation.
5. Rollback by restoring previous `AppRouter`, removing new shell/auth UI files and keeping existing auth client/store intact.

## Open Questions

- Final route names can remain provisional until business modules are implemented; recommended starting paths are `/login`, `/register`, `/app`, `/admin`, `/stock`, `/orders`.
- Token storage should be revisited in a later security-hardening change if httpOnly refresh cookies become required.
