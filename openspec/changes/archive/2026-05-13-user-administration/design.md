## Context

The project already has FastAPI auth/RBAC primitives, identity persistence (`User`, `Role`, `UserRole`), canonical API contracts, and a React/Vite authenticated shell with role-aware routing/navigation. Existing admin features use `/api/v1/admin/*` endpoints protected by backend `require_role(...)`, while the frontend uses guards only as UX protection.

User administration is cross-cutting: it touches identity persistence, security-sensitive role assignment, admin APIs, frontend routes, query/mutation state, and tests. The design must preserve the existing auth invariants: password hashes and refresh-token internals are never exposed, all errors use the canonical contract, pagination follows the canonical shape, and backend RBAC remains authoritative.

## Goals / Non-Goals

**Goals:**
- Provide ADMIN-only APIs for listing, filtering, viewing, creating, updating, activating/deactivating, role-changing, and password-resetting users.
- Reuse the existing identity module rather than introducing a separate account-management bounded context.
- Expose safe user DTOs that include public identity fields, active/deleted status where appropriate, role codes, and audit timestamps, but no secrets.
- Add a protected admin UI for user search/list/detail/edit workflows, wired through TanStack Query and the existing HTTP client/error handling.
- Cover backend authorization/validation/state-transition tests and frontend route/navigation/form-state tests.

**Non-Goals:**
- Self-service customer profile changes beyond the existing customer profile capability.
- Email delivery or external notification integration for password resets; the first version may return/record reset intent semantics without sending email.
- Fine-grained permission management beyond existing role codes (`ADMIN`, `STOCK`, `PEDIDOS`, `CLIENT`).
- Hard-deleting users or exposing deleted users to non-admin customer flows.

## Decisions

1. **Implement administration inside the identity/auth area using admin-prefixed routes.**
   - Chosen: add `backend/app/modules/identity` admin schemas/service/router extensions or a closely related `admin_users` module, mounted under `/api/v1/admin/users`.
   - Why: user administration is lifecycle management over existing identity aggregates, not a separate domain. Keeping it near identity avoids duplicated role/user logic.
   - Alternative considered: create a new top-level `users` module. That is cleaner for route naming but risks splitting identity invariants across modules too early.

2. **Use backend RBAC as the only authorization boundary.**
   - Chosen: protect all user-admin routes with `require_role("ADMIN")` and add service-level guards for sensitive invariants such as preventing self-deactivation or removing the last admin.
   - Why: existing specs already state frontend role restrictions are UX only. Sensitive account actions need backend enforcement.
   - Alternative considered: rely on frontend guards for admin pages. Rejected because hidden UI is not security.

3. **Return safe admin user DTOs instead of reusing ORM/auth payloads.**
   - Chosen: dedicated schemas such as `AdminUserSummary`, `AdminUserDetail`, `AdminUserCreate`, `AdminUserUpdate`, `AdminUserRoleUpdate`, and password-reset/change payloads.
   - Why: auth payloads are optimized for session identity, while admin screens need pagination metadata, role lists, lifecycle state, and audit fields without leaking secrets.
   - Alternative considered: extend `/auth/me` response. Rejected because current-user session shape should remain stable and minimal.

4. **Prefer soft lifecycle transitions over destructive deletion.**
   - Chosen: deactivate/reactivate via `is_active` and existing soft-delete fields only where the existing model supports them; do not physically delete users.
   - Why: orders/payments/profile data may reference users, so hard deletes would break auditability and referential integrity.
   - Alternative considered: hard delete admin action. Rejected for operational and audit risk.

5. **Password reset is ADMIN-initiated but secret-safe.**
   - Chosen: ADMIN can set a temporary password or issue a reset action according to implementation constraints, but responses never return password hashes or token hashes. If reset tokens are introduced, only hashed values are persisted.
   - Why: this preserves the auth security model while enabling operational recovery.
   - Alternative considered: expose direct password hash mutation. Rejected categorically; hashes are internal security data.

6. **Frontend follows existing feature/page conventions.**
   - Chosen: add `features/users` or `features/user-administration` hooks/query keys/types, `pages/admin-users-page`, optional `pages/admin-user-detail-page`, route entries in `route-config.ts`, and navigation in the authenticated shell.
   - Why: matches current React structure for admin orders/products/categories and keeps server state in TanStack Query.
   - Alternative considered: local component state with manual axios calls. Rejected because cache invalidation and mutation feedback would diverge from the rest of the app.

## Risks / Trade-offs

- **Accidental privilege escalation through role updates** → Restrict role mutation to ADMIN, validate submitted role codes against known roles, and add tests for CLIENT/STOCK/PEDIDOS denial.
- **Locking out all administrators** → Add a guard preventing deactivation/removal of the last active ADMIN and preventing unsafe self-demotion/deactivation.
- **Sensitive data exposure in admin DTOs** → Use dedicated response schemas and tests asserting absence of `hashed_password`, refresh token fields, and internal security metadata.
- **Search/list performance degradation** → Use indexed fields already present (`email`) and add indexes only if new query patterns require them; keep canonical pagination mandatory.
- **Frontend inconsistency with backend authorization** → Keep route guards and navigation for UX, but always handle HTTP 401/403 from backend with access-denied/global feedback states.

## Migration Plan

1. Add/extend backend schemas, repository list/search methods, service logic, admin router, and API router registration.
2. Add Alembic migration only if implementation introduces reset token tables or additional lifecycle/audit columns; otherwise avoid schema churn.
3. Add backend tests for RBAC, list/detail pagination, create/update validation, duplicate email handling, role changes, activation/deactivation, and password reset semantics.
4. Add frontend API hooks/query keys/types, admin pages, routes, navigation entries, and tests.
5. Rollback by removing the new admin routes/UI; no existing public/customer behavior should depend on this change.

## Open Questions

- Should ADMIN password reset set a temporary password immediately, or create a one-time reset token for a future email/notification flow?
- Should admin listing include soft-deleted users, or only active/inactive non-deleted users by default with an explicit filter?
- Do STOCK/PEDIDOS need read-only visibility into users, or is user administration strictly ADMIN-only for the first version?
