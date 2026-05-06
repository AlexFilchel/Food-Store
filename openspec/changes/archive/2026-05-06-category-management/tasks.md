## 1. Backend Data Model and Migration

- [x] 1.1 Add `categories` backend module structure with model, schemas, repository, service and router files.
- [x] 1.2 Create SQLModel category model with audit fields, soft delete, `parent_id`, slug, active flag and sort order.
- [x] 1.3 Add Alembic migration for `categories` table, self foreign key, indexes and active sibling uniqueness.
- [x] 1.4 Add migration tests for upgrade/downgrade and key constraints/indexes.

## 2. Backend Category Domain Logic

- [x] 2.1 Implement category repository queries for list, tree source data, sibling lookup, child existence and descendant traversal.
- [x] 2.2 Implement category service create/update rules for parent existence, duplicate siblings and cycle prevention.
- [x] 2.3 Implement soft delete with active child restriction and canonical conflict errors.
- [x] 2.4 Add stable category error codes using the canonical problem contract.

## 3. Backend API and Authorization

- [x] 3.1 Add ADMIN-protected routes for list, tree, detail, create, update and delete under `/api/v1/admin/categories`.
- [x] 3.2 Wire category router into `backend/app/api/router.py`.
- [x] 3.3 Add API tests for ADMIN success paths and anonymous/non-admin 401/403 behavior.
- [x] 3.4 Add service/API tests for duplicate, invalid parent, cycle and has-children cases.

## 4. Frontend Category Administration

- [x] 4.1 Add category route metadata and ADMIN navigation entry for `/admin/categories`.
- [x] 4.2 Add category API client, TypeScript types and TanStack Query key factory/hooks.
- [x] 4.3 Add category management page with list/tree display, loading, empty and error states.
- [x] 4.4 Add category create/edit form with parent selector, active flag and sort order fields.
- [x] 4.5 Add delete action with confirmation and child-restriction error handling.

## 5. Frontend Tests and UX Verification

- [x] 5.1 Add route/access tests proving only ADMIN can reach category management UI.
- [x] 5.2 Add UI tests for loading categories, creating, editing and deleting with query invalidation.
- [x] 5.3 Add UI tests for duplicate/hierarchy/delete restriction errors preserving form state.
- [x] 5.4 Verify accessible form labels, buttons, error messages and navigation state.

## 6. Final Verification

- [x] 6.1 Run backend targeted tests for categories, migrations, auth/RBAC and canonical errors.
- [x] 6.2 Run frontend typecheck and targeted category/router tests; do not run production build.
- [x] 6.3 Update `verify-report.md` with task completion, test results, spec compliance and design coherence.
