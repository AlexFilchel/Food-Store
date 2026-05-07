## Context

`bootstrap-foundation` provides FastAPI, SQLModel/SQLAlchemy Async, Alembic, repository/UoW foundations, pagination and canonical problem errors. `auth-rbac-core` provides authentication and reusable role guards. `frontend-shell-access-control` provides protected admin routing and role-aware navigation. `category-management` provides hierarchical soft-deleted categories. `ingredient-management` provides ingredient and allergen dictionaries.

Product catalog management is the first slice that combines those catalog foundations into sellable products. Later public catalog, cart, checkout and order flows will depend on product price, stock, availability and composition being consistent.

## Goals / Non-Goals

**Goals:**
- Model products with name, slug, description, price, stock quantity, active flag, availability flag, audit timestamps and soft delete.
- Model product-category associations using existing active non-deleted categories.
- Model product-ingredient associations using existing active non-deleted ingredients with product-specific `is_removable` metadata.
- Provide ADMIN-only CRUD APIs using the existing Router -> Service -> UnitOfWork -> Repository -> Model flow.
- Support admin list/detail with pagination and filters for search, category, ingredient, availability, active state and stock state.
- Enforce availability semantics: soft delete, `is_available=false` and `stock_quantity=0` are distinct states.
- Prevent deleting categories or ingredients that are referenced by active non-deleted products.
- Provide admin UI for listing, filtering, creating, editing, soft-deleting and managing composition.
- Cover backend rules and frontend flows with targeted tests.

**Non-Goals:**
- No public catalog endpoints or customer-facing product pages.
- No shopping cart, personalization UI, checkout validation or stock reservation.
- No order stock decrement/restoration.
- No product image upload/storage; image URL fields can be deferred unless already required by UI needs.
- No product variants/options beyond category and ingredient composition.
- No bulk import/export.

## Decisions

### 1. Product aggregate owns sellable catalog invariants

Use a dedicated `products` module with `Product`, `ProductCategory` and `ProductIngredient` models. Product service owns validation for category ids, ingredient ids, duplicate product slugs, stock quantity and association replacement.

- **Why:** Products are the consistency boundary for sellable catalog data and combine multiple catalog dictionaries.
- **Alternative:** Put product associations in category/ingredient services. Rejected because it spreads product invariants across unrelated modules.

### 2. Many-to-many category and ingredient associations

Use explicit join tables:
- `product_categories(product_id, category_id)`
- `product_ingredients(product_id, ingredient_id, is_removable)`

- **Why:** A product can belong to multiple categories and contain many ingredients; removability is product-specific, not global ingredient metadata.
- **Alternative:** Single category FK and JSON ingredient list. Rejected because it limits filtering and weakens referential integrity.

### 3. Distinct product availability states

Represent three independent concerns:
- `deleted_at IS NOT NULL`: product is logically removed from normal reads.
- `is_available=false`: product exists but should not be sellable/displayed as available.
- `stock_quantity=0`: product exists and may be visible but cannot currently be purchased.

- **Why:** Roadmap explicitly says these states are not equivalent; checkout must later return actionable differences.
- **Alternative:** Derive availability only from stock. Rejected because admins need planned/manual availability separate from stock.

### 4. ADMIN-only product management for this change

Expose product management under `/api/v1/admin/products` and `/admin/products`, requiring role `ADMIN`.

- **Why:** Categories and ingredients are ADMIN-only today. The roadmap notes fine-grained `STOCK` permissions are ambiguous; do not broaden permissions without explicit endpoint rules.
- **Alternative:** Allow `STOCK` to manage stock immediately. Rejected for this change; a later stock-specific change can introduce scoped stock-only operations.

### 5. Soft delete first, no hard delete endpoints

`DELETE /api/v1/admin/products/{id}` sets `deleted_at`; normal admin reads exclude deleted products by default.

- **Why:** Orders will later need product snapshots and historical references. Hard delete is unsafe for catalog records.
- **Alternative:** Hard delete until orders exist. Rejected because it changes lifecycle semantics later and increases migration risk.

### 6. Category/ingredient delete restrictions include product references

Category delete must reject categories referenced by active non-deleted products. Ingredient delete must reject ingredients referenced by active non-deleted products.

- **Why:** Deleting referenced catalog atoms would corrupt product composition/taxonomy.
- **Alternative:** Let category/ingredient soft-delete and hide the product association. Rejected because active products would silently lose required catalog meaning.

### 7. Price stored as Decimal/NUMERIC

Use `NUMERIC(12, 2)` / Decimal for product price and validate non-negative values at API boundary and service layer.

- **Why:** Existing foundation calls out money with Decimal/NUMERIC; floats are not acceptable for prices.
- **Alternative:** Store cents as integer. Viable, but current project convention favors Decimal/NUMERIC.

### 8. TanStack Query server-state patterns

Use query key factories such as `['products', 'list', filters]`, `['products', 'detail', id]` and targeted invalidation after product/category/ingredient association mutations.

- **Why:** Product catalog data is server state. Query factories avoid stale admin views and cache collisions.
- **Alternative:** Store product dictionaries in Zustand. Rejected because it duplicates server state.

## Data Model

`products` table:
- `id`: integer primary key
- `name`: required string, max 160
- `slug`: required string, max 180, normalized lowercase
- `description`: nullable text
- `price`: `NUMERIC(12, 2)`, non-negative
- `stock_quantity`: integer, non-negative, default 0
- `is_active`: boolean default true
- `is_available`: boolean default true
- `created_at`, `updated_at`, `deleted_at`

`product_categories` table:
- `product_id`: FK to `products.id`, `ON DELETE RESTRICT`
- `category_id`: FK to `categories.id`, `ON DELETE RESTRICT`
- composite primary key or unique constraint on `(product_id, category_id)`

`product_ingredients` table:
- `product_id`: FK to `products.id`, `ON DELETE RESTRICT`
- `ingredient_id`: FK to `ingredients.id`, `ON DELETE RESTRICT`
- `is_removable`: boolean default true
- composite primary key or unique constraint on `(product_id, ingredient_id)`

Indexes/constraints:
- partial unique index for active non-deleted product slug.
- indexes for `deleted_at`, `is_active`, `is_available`, `stock_quantity` admin filtering.
- indexes on `product_categories.product_id`, `product_categories.category_id`.
- indexes on `product_ingredients.product_id`, `product_ingredients.ingredient_id`.
- check constraints for `price >= 0` and `stock_quantity >= 0`.

PostgreSQL migration note: partial indexes should use dialect-safe predicates such as `deleted_at IS NULL AND is_active IS TRUE` for PostgreSQL and SQLite-compatible equivalents in tests.

## API Changes

All endpoints require authenticated `ADMIN` role:

- `GET /api/v1/admin/products?page=&size=&search=&category_id=&ingredient_id=&include_inactive=&availability=&stock_state=` returns a paginated list.
- `GET /api/v1/admin/products/{id}` returns one product with categories and ingredients.
- `POST /api/v1/admin/products` creates a product with optional category ids and ingredient composition.
- `PATCH /api/v1/admin/products/{id}` updates editable product fields and replaces category/ingredient associations only when those fields are supplied.
- `DELETE /api/v1/admin/products/{id}` soft deletes the product.

Payload notes:
- Ingredient composition uses entries like `{ ingredient_id, is_removable }`.
- Category ids and ingredient ids must refer to active non-deleted catalog records.
- Stock and price must be non-negative.

Errors use the canonical problem contract with stable codes such as `PRODUCT_NOT_FOUND`, `PRODUCT_DUPLICATE`, `PRODUCT_INVALID_CATEGORY`, `PRODUCT_INVALID_INGREDIENT`, `PRODUCT_INVALID_PRICE`, `PRODUCT_INVALID_STOCK`, `CATEGORY_HAS_PRODUCTS` and `INGREDIENT_HAS_PRODUCTS`.

## Frontend Design

- Add `/admin/products` route visible to `ADMIN`.
- Add product API client and TypeScript types.
- Add TanStack Query key factories and hooks for product list/detail/mutations.
- Product management page includes:
  - product list with search/filter controls;
  - badges for categories, ingredients and availability/stock state;
  - product create/edit form with name, description, price, stock quantity, active flag, availability flag, category multi-select and ingredient composition editor;
  - ingredient composition editor controls `is_removable` per product ingredient;
  - delete action with confirmation and canonical error feedback.
- UI loads category and ingredient dictionaries via existing APIs/hooks and avoids duplicating them in Zustand.

## Risks / Trade-offs

- Product association replacement can accidentally drop categories/ingredients on partial updates → only replace associations when payload explicitly includes `category_ids` or `ingredients`.
- `stock_quantity=0` vs `is_available=false` can be conflated in UI → show both fields and state badges separately.
- Category/ingredient deletion restrictions now cross modules → implement dependency checks through product repository/UoW and keep category/ingredient services as callers of explicit reference checks.
- Price Decimal serialization can drift between backend/frontend → expose prices as strings or canonical decimal-compatible payloads, and test round trips.
- Public catalog will later need optimized filters → add admin query indexes now but avoid premature public endpoint design.

## Migration Plan

1. Add product tables, association tables, constraints and indexes in a new Alembic migration.
2. Add backend product module and router wiring.
3. Extend category and ingredient deletion services to check active product references.
4. Add frontend product admin route, API client, hooks and UI.
5. Add tests for migrations, product CRUD, association validation, stock/availability semantics, deletion restrictions, RBAC and UI flows.
6. Rollback by removing frontend route/module, router wiring and downgrading the product migration if no dependent cart/order data exists.

## Open Questions

- Product images are intentionally deferred. If the UI needs a placeholder field during apply, prefer a nullable `image_url` string over upload/storage.
- `STOCK` role product permissions remain deferred until a stock-specific workflow defines exact allowed operations.
