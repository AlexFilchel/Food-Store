## Context

`bootstrap-foundation` provides FastAPI, SQLModel/SQLAlchemy Async, Alembic, repository/UoW foundations, pagination and canonical problem errors. `auth-rbac-core` provides reusable authentication and `require_role(...)`. `frontend-shell-access-control` provides protected admin routing, role-aware navigation and TanStack Query/Zustand separation. `category-management` established the catalog-admin pattern for soft-deleted catalog records and ADMIN-only management UI.

Ingredients are the next catalog foundation slice. Products will later reference ingredients, customers will need allergen visibility, and cart customization will need product-specific removability rules. This change only owns the global ingredient/allergen dictionaries and their associations.

## Goals / Non-Goals

**Goals:**
- Model ingredients and allergens with audit timestamps, active flag and soft delete.
- Model many-to-many ingredient-allergen associations.
- Provide ADMIN-only CRUD APIs using the existing Router -> Service -> UnitOfWork -> Repository -> Model flow.
- Enforce active-name/slug uniqueness for ingredients and allergens.
- Hide soft-deleted ingredients/allergens from default reads.
- Prevent deleting allergens that are still referenced by active ingredients.
- Provide admin UI for listing, filtering, creating, editing and deleting ingredients/allergens.
- Cover backend rules and frontend flows with targeted tests.

**Non-Goals:**
- No product-ingredient relationship yet.
- No product-specific removability flag; removability belongs to the future product-ingredient relation, not the global ingredient.
- No stock quantity, unit conversion or inventory movements.
- No public catalog allergen filtering.
- No bulk import/export.

## Decisions

### 1. Separate `ingredients` and `allergens` tables with a join table

Use `ingredients`, `allergens` and `ingredient_allergens` instead of storing allergens as JSON on ingredients.

- **Why:** Allergens are reusable catalog entities, need their own CRUD lifecycle, and will power future filters and product composition displays.
- **Alternative:** Store allergen names in a JSON array. Rejected because it makes deduplication, filtering, referential integrity and admin editing harder.

### 2. Backend service owns association and deletion invariants

Ingredient creation/update validates allergen ids, excludes deleted allergens and replaces associations atomically in the service/UoW boundary. Allergen delete checks active ingredient references before soft delete.

- **Why:** Backend remains source of truth; API clients can bypass frontend validation.
- **Alternative:** Let database constraints handle every case. Rejected because soft delete and active-only semantics require domain-aware checks and canonical errors.

### 3. Soft delete first, no hard delete endpoints

`DELETE /api/v1/admin/ingredients/{id}` and `DELETE /api/v1/admin/allergens/{id}` set `deleted_at`; normal reads exclude deleted rows.

- **Why:** Catalog records can later be referenced by products/orders and should not disappear destructively.
- **Alternative:** Hard delete before products exist. Rejected because it creates inconsistent behavior when product associations are added later.

### 4. Active uniqueness by normalized slug

Generate slugs from names and enforce uniqueness among active non-deleted rows for both ingredients and allergens.

- **Why:** Prevents duplicate active dictionary entries while allowing replacement after soft delete.
- **Alternative:** Globally unique names forever. Rejected because soft delete replacement should be possible during catalog maintenance.

### 5. ADMIN-only UI and APIs for this slice

Expose ingredient management under `/admin/ingredients` and require `ADMIN` role for all endpoints.

- **Why:** This follows the already implemented category-management boundary. The `STOCK` role can receive scoped permissions later when inventory/product stock workflows are designed.
- **Alternative:** Allow `STOCK` to manage ingredients now. Rejected because the current category admin pattern rejects non-admins and broadening permissions before product/stock workflows would be premature.

### 6. TanStack Query key factories for server state

Use query keys like `['ingredients', 'list', filters]`, `['ingredients', 'detail', id]`, `['allergens', 'list', filters]` and targeted invalidation after mutations.

- **Why:** Ingredients/allergens are server state and must stay coherent after association changes.
- **Alternative:** Store dictionaries in Zustand. Rejected because it duplicates server state and risks stale admin data.

## Data Model

`ingredients` table:
- `id`: integer primary key
- `name`: required string, max 120
- `slug`: required string, max 140, normalized lowercase
- `description`: nullable text
- `is_active`: boolean default true
- `created_at`, `updated_at`, `deleted_at`

`allergens` table:
- `id`: integer primary key
- `name`: required string, max 120
- `slug`: required string, max 140, normalized lowercase
- `description`: nullable text
- `is_active`: boolean default true
- `created_at`, `updated_at`, `deleted_at`

`ingredient_allergens` table:
- `ingredient_id`: FK to `ingredients.id`, `ON DELETE RESTRICT`
- `allergen_id`: FK to `allergens.id`, `ON DELETE RESTRICT`
- composite primary key or unique constraint on `(ingredient_id, allergen_id)`

Indexes/constraints:
- partial unique index for active non-deleted ingredient slug.
- partial unique index for active non-deleted allergen slug.
- index on `ingredient_allergens.ingredient_id`.
- index on `ingredient_allergens.allergen_id`.
- query-supporting indexes on `(deleted_at, is_active)` for ingredient/allergen admin lists.

PostgreSQL migration note: partial indexes should use dialect-safe predicates such as `deleted_at IS NULL AND is_active IS TRUE` for PostgreSQL and SQLite-compatible equivalents in tests.

## API Changes

All endpoints require authenticated `ADMIN` role:

Ingredient endpoints:
- `GET /api/v1/admin/ingredients?page=&size=&search=&include_inactive=&allergen_id=` returns a paginated list.
- `GET /api/v1/admin/ingredients/{id}` returns one ingredient with associated allergens.
- `POST /api/v1/admin/ingredients` creates an ingredient and optional allergen associations.
- `PATCH /api/v1/admin/ingredients/{id}` updates editable fields and replaces allergen associations when supplied.
- `DELETE /api/v1/admin/ingredients/{id}` soft deletes the ingredient.

Allergen endpoints:
- `GET /api/v1/admin/allergens?page=&size=&search=&include_inactive=` returns a paginated list.
- `GET /api/v1/admin/allergens/{id}` returns one allergen.
- `POST /api/v1/admin/allergens` creates an allergen.
- `PATCH /api/v1/admin/allergens/{id}` updates editable fields.
- `DELETE /api/v1/admin/allergens/{id}` soft deletes the allergen when no active ingredient references it.

Errors use the canonical problem contract with stable codes such as `INGREDIENT_NOT_FOUND`, `INGREDIENT_DUPLICATE`, `INGREDIENT_INVALID_ALLERGEN`, `ALLERGEN_NOT_FOUND`, `ALLERGEN_DUPLICATE` and `ALLERGEN_IN_USE`.

## Frontend Design

- Add `/admin/ingredients` route visible to `ADMIN`.
- Add ingredient/allergen API clients and TypeScript types.
- Add TanStack Query key factories and hooks for lists, details and mutations.
- Ingredient management page includes:
  - ingredient list with search/filter controls;
  - allergen badges on each ingredient;
  - ingredient create/edit form with name, description, active flag and allergen multi-select;
  - ingredient delete action with confirmation.
- Allergen management page or tab includes:
  - allergen list with search/filter controls;
  - allergen create/edit form;
  - allergen delete action with in-use error feedback.
- UI surfaces canonical backend errors without losing form state.

## Risks / Trade-offs

- Partial unique index predicates can diverge across SQLite tests and PostgreSQL production → use dialect-specific Alembic options and migration tests that assert generated PostgreSQL SQL.
- Replacing associations can accidentally drop links on partial updates → only replace allergen associations when the update payload explicitly includes `allergen_ids`.
- Soft-deleting allergens referenced by active ingredients could hide critical safety information → reject allergen deletion while active ingredients reference it.
- `STOCK` role may later need scoped catalog permissions → keep this change ADMIN-only and revisit with explicit stock/product management requirements.
- Large ingredient dictionaries can make client-side filtering expensive → implement backend `search`, pagination and indexed slug/name lookups now.

## Migration Plan

1. Add `ingredients`, `allergens` and `ingredient_allergens` tables in a new Alembic migration.
2. Add partial active uniqueness indexes and association lookup indexes.
3. Add backend module and router wiring.
4. Add frontend admin route, API clients, hooks and UI.
5. Add tests for migrations, CRUD, uniqueness, associations, soft delete, RBAC and UI flows.
6. Rollback by removing frontend route/module and downgrading the migration if no dependent product data exists.

## Open Questions

- Whether slugs remain internal-only or become user-editable can be decided during apply; default recommendation is auto-generate from name and keep API responses explicit.
- Whether allergens need severity/category metadata is deferred until public catalog filtering or regulatory requirements demand it.
