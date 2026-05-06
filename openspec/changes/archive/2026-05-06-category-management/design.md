## Context

`bootstrap-foundation` provides FastAPI, SQLModel/SQLAlchemy Async, Alembic, repository/UoW foundations, pagination and canonical errors. `auth-rbac-core` provides reusable `get_current_user` and `require_role(...)`. `frontend-shell-access-control` provides protected admin routing, role-aware navigation and TanStack Query/Zustand separation.

Categories are the first catalog management slice. They must be hierarchical, safe to mutate, and reusable by later product/catalog changes.

## Goals / Non-Goals

**Goals:**
- Model hierarchical categories with soft delete and audit timestamps.
- Provide ADMIN-only CRUD APIs using existing Router -> Service -> UoW -> Repository -> Model flow.
- Enforce parent existence, no self-parenting and no ancestry cycles.
- Prevent deleting categories that still have active child categories.
- Provide admin UI for listing, creating, editing, nesting and deleting categories.
- Cover backend rules and frontend flows with targeted tests.

**Non-Goals:**
- No product/category association yet.
- No public catalog browsing or SEO category pages.
- No drag-and-drop tree reordering.
- No multi-tenant category ownership.

## Decisions

### 1. Adjacency-list hierarchy
Use `categories.parent_id` as a nullable self-reference instead of nested sets/materialized paths.

- **Why:** CRUD and validation are simple, and current depth/volume is expected to be modest.
- **Alternative:** nested sets/materialized paths. Rejected because they add write complexity before product catalog needs prove it.

### 2. Backend service owns hierarchy invariants
Cycle checks, parent validation and deletion restrictions live in `CategoryService`, not in routers or frontend.

- **Why:** Backend remains source of truth; frontend only improves UX.
- **Alternative:** frontend-only validation. Rejected because API clients could bypass it.

### 3. Soft delete first, no hard delete endpoint
`DELETE /api/v1/admin/categories/{id}` sets `deleted_at`; normal reads exclude deleted rows.

- **Why:** Keeps catalog history and avoids accidental destructive operations.
- **Alternative:** hard delete. Rejected because products will later reference categories.

### 4. Sibling uniqueness by slug/name among active categories
Enforce unique active category identity within the same parent. Generate or accept slug from normalized name and keep a partial unique index excluding deleted rows.

- **Why:** Allows same category label in different branches while avoiding duplicate siblings.
- **Alternative:** globally unique names. Rejected because hierarchical catalogs often reuse names.

### 5. Admin UI uses TanStack Query factories
Categories are server state. Use query keys like `['categories', 'list', filters]` and targeted invalidation after mutations.

- **Why:** Prevents stale lists/tree and follows existing server-state foundation.
- **Alternative:** store categories in Zustand. Rejected because this duplicates server state.

## Data Model

`categories` table:
- `id`: integer primary key
- `name`: required string, max 120
- `slug`: required string, max 140, normalized lowercase
- `description`: nullable text
- `parent_id`: nullable FK to `categories.id`, `ON DELETE RESTRICT`
- `sort_order`: integer default 0
- `is_active`: boolean default true
- `created_at`, `updated_at`, `deleted_at`

Indexes/constraints:
- index on `parent_id`
- index on `(deleted_at, parent_id)` or partial active lookup support
- partial unique index on `(parent_id, slug)` where `deleted_at IS NULL`, plus root handling for `parent_id IS NULL` if needed by PostgreSQL semantics.

## API Changes

All endpoints require authenticated `ADMIN` role:

- `GET /api/v1/admin/categories?page=&size=&include_inactive=&parent_id=` returns paginated flat list.
- `GET /api/v1/admin/categories/tree?include_inactive=` returns hierarchical tree.
- `GET /api/v1/admin/categories/{id}` returns one category.
- `POST /api/v1/admin/categories` creates a category.
- `PATCH /api/v1/admin/categories/{id}` updates editable fields and parent.
- `DELETE /api/v1/admin/categories/{id}` soft deletes the category.

Errors use canonical problem contract with stable codes such as `CATEGORY_NOT_FOUND`, `CATEGORY_DUPLICATE`, `CATEGORY_CYCLE_DETECTED`, `CATEGORY_HAS_CHILDREN`, `CATEGORY_INVALID_PARENT`.

## Frontend Design

- Add `/admin/categories` route visible to `ADMIN`.
- Add category API client and query key factory.
- Use list/tree queries and create/update/delete mutations with targeted invalidation.
- Category form includes name, description, parent selector, active flag and sort order.
- Delete action confirms intent and surfaces child restriction errors.

## Risks / Trade-offs

- Recursive tree construction can become expensive with many categories → fetch active categories in one query and build tree in memory; revisit recursive CTE only if needed.
- Partial unique root constraints with nullable `parent_id` need care → use expression/index strategy verified by migration tests.
- Later product references may change delete restrictions → design soft delete and `ON DELETE RESTRICT` now to avoid unsafe hard deletes.
- Frontend tree interactions can grow complex → keep initial UI simple: list/tree display plus parent select, no drag-and-drop.

## Migration Plan

1. Add category table and indexes in a new Alembic migration.
2. Add backend module and router wiring.
3. Add frontend admin category route and API hooks.
4. Add tests for migration, service invariants, API permissions and UI flows.
5. Rollback by removing the frontend route/module and downgrading the migration if no dependent product data exists.

## Open Questions

- Whether category slug is user-editable or always derived from name can be decided during apply; default recommendation is auto-generate with optional explicit override only if product requirements demand it.
