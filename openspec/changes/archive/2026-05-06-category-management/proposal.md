## Why

The product catalog needs a stable taxonomy before products can be created, filtered or shown publicly. This change introduces administrative category management now that auth/RBAC and the protected frontend shell are available.

## What Changes

- Add hierarchical category persistence with audit fields and soft delete.
- Add ADMIN-protected backend CRUD endpoints for categories.
- Support listing categories as flat paginated data and as a hierarchy/tree.
- Validate parent references and prevent cycles when creating or moving categories.
- Prevent unsafe deletion when active child categories still depend on a category.
- Add admin frontend screens for listing, creating, editing, nesting and deleting categories.
- No product-category association is introduced yet.

## Capabilities

### New Capabilities
- `category-management`: Administrative management of hierarchical product categories, including CRUD, parent/child rules, soft delete, RBAC-protected APIs and frontend admin UI.

### Modified Capabilities

None.

## Impact

- `backend/app/modules/categories/*`: new model, schemas, repository, service and router.
- `backend/alembic/versions/*`: migration for category table, indexes and constraints.
- `backend/app/api/router.py`: include category router.
- `backend/tests/*`: backend tests for CRUD, hierarchy rules, soft delete and RBAC.
- `frontend/src/app/routes/route-config.ts`: add admin category route/navigation metadata.
- `frontend/src/pages/*`, `frontend/src/features/*`, `frontend/src/entities/*`: category admin UI, forms, API client and TanStack Query hooks.
- `openspec/specs/category-management/spec.md`: new capability after archive.
