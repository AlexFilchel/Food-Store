## 1. Backend identity administration foundation

- [ ] 1.1 Add admin user schemas for summary/detail/create/update/role-update/lifecycle/password-reset payloads and safe responses.
- [ ] 1.2 Extend identity repository methods for paginated list/search/filter, user detail lookup with roles, role replacement, and active ADMIN counts.
- [ ] 1.3 Add identity administration errors using the canonical error contract for duplicate email, invalid role, missing user, and unsafe last-admin operations.
- [ ] 1.4 Implement identity administration service methods for list, detail, create, profile update, role update, activation/deactivation, and password reset.
- [ ] 1.5 Add or update Alembic migration only if implementation introduces new reset-token/lifecycle persistence fields.

## 2. Backend API routes and security

- [ ] 2.1 Add `/api/v1/admin/users` routes protected by `require_role("ADMIN")` for listing and creating users.
- [ ] 2.2 Add `/api/v1/admin/users/{user_id}` routes for detail retrieval and editable profile updates.
- [ ] 2.3 Add role-management route for replacing a user's role codes with validation against known roles.
- [ ] 2.4 Add activation/deactivation routes with safeguards against removing the last active ADMIN.
- [ ] 2.5 Add password-reset route that applies configured reset semantics without exposing hashes or token internals.
- [ ] 2.6 Register the new admin user router in the API router using existing versioning/tag conventions.

## 3. Backend tests

- [ ] 3.1 Add tests proving anonymous and non-ADMIN users receive 401/403 for every admin user endpoint category.
- [ ] 3.2 Add list/detail tests for pagination metadata, search/role/status filters, missing-user behavior, and secret-field redaction.
- [ ] 3.3 Add create/update tests for valid users, duplicate email rejection, validation errors, and safe response shape.
- [ ] 3.4 Add role-update and lifecycle tests for valid transitions plus last-admin/self-lockout safeguards.
- [ ] 3.5 Add password-reset tests for weak payload rejection, secret redaction, and old/new credential behavior when direct password reset is implemented.

## 4. Frontend user-administration data layer

- [ ] 4.1 Add user-administration API client functions and TypeScript DTOs matching backend safe admin user contracts.
- [ ] 4.2 Add TanStack Query keys and hooks for paginated user lists, user detail, create/update, role changes, lifecycle mutations, and password reset.
- [ ] 4.3 Ensure successful mutations invalidate or refresh affected user list/detail queries and surface canonical API errors through existing feedback patterns.

## 5. Frontend routes and UI

- [ ] 5.1 Add ADMIN-only route configuration for user administration and optional user detail/edit route inside the authenticated shell.
- [ ] 5.2 Add role-aware navigation entry visible to `ADMIN` and hidden from customer-only or non-admin sessions.
- [ ] 5.3 Implement user list page with search, role/status filters, pagination, loading, empty, error, and success states.
- [ ] 5.4 Implement user detail/edit interactions for profile updates, role changes, activation/deactivation, and password reset with accessible controls and feedback.
- [ ] 5.5 Ensure frontend 401/403 responses use existing session/access-denied handling and never render sensitive token or password internals.

## 6. Frontend tests and verification

- [ ] 6.1 Add route-guard/navigation tests proving ADMIN can access user administration and non-admin/anonymous users cannot render protected content.
- [ ] 6.2 Add user list UI tests for search/filter/pagination states and API error handling.
- [ ] 6.3 Add mutation UI tests for create/update/role/lifecycle/reset success feedback and query refresh behavior.
- [ ] 6.4 Run targeted backend tests for user administration and auth regression coverage.
- [ ] 6.5 Run targeted frontend tests and typecheck for user-administration routes, hooks, and components.
