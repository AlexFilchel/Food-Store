## Why

Administrators currently have authentication/RBAC foundations but no operational user-management surface to review, search, create, update, disable, or reset access for staff/customer accounts. This change closes that gap so privileged users can administer identities safely without direct database access.

## What Changes

- Add backend admin user-management APIs for paginated user listing, user detail retrieval, staff/customer creation, profile/role updates, account activation/deactivation, and password reset initiation/completion semantics.
- Add frontend administration screens inside the protected shell for listing users, filtering/searching users, viewing details, and performing allowed account actions.
- Enforce backend RBAC as the source of truth; only privileged roles may administer users, and destructive/sensitive actions are guarded by explicit role checks.
- Preserve auth security invariants: never expose password hashes, refresh-token hashes, or internal security metadata; use canonical API errors and pagination.
- Add audit-friendly timestamps/status fields to responses and tests covering authorization, validation, duplicate emails, pagination, and state transitions.

## Capabilities

### New Capabilities
- `user-administration`: Administrative user lifecycle management across backend APIs and frontend admin UI.

### Modified Capabilities
- `auth-rbac-core`: Extend RBAC expectations with privileged account-administration authorization and safe user response contracts.
- `frontend-shell-access-control`: Add admin-only user-administration navigation/routes that remain hidden from customer-only sessions.

## Impact

- Backend: `backend/app/modules/identity`, new or extended admin router/service/repository/schemas/errors, API router registration, tests, and possibly Alembic migration if additional user lifecycle/audit fields are required.
- Frontend: protected admin route(s), role-aware navigation, API client/query hooks, user list/detail/form components, and tests.
- API contracts: canonical pagination, RFC 7807-style errors, UTC timestamps, and sensitive-field redaction remain mandatory.
- Security: all mutations require backend RBAC; frontend route checks are UX only and must not be treated as authorization.
