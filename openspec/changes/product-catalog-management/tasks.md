## 1. Backend Data Model and Migration

- [ ] 1.1 Add `products` backend module structure with models, schemas, repository, service, errors and router files.
- [ ] 1.2 Create `Product` SQLModel model with audit fields, soft delete, name, slug, description, price, stock quantity, active flag and availability flag.
- [ ] 1.3 Create `ProductCategory` association model/table with composite uniqueness and category foreign key.
- [ ] 1.4 Create `ProductIngredient` association model/table with composite uniqueness, ingredient foreign key and product-specific `is_removable`.
- [ ] 1.5 Add Alembic migration for product tables, association tables, check constraints, lookup indexes and active product slug uniqueness.
- [ ] 1.6 Add migration tests for upgrade/downgrade, constraints, association indexes and PostgreSQL-safe partial index predicates.

## 2. Backend Product Domain Logic

- [ ] 2.1 Implement product repository queries for list/detail, active slug lookup, filtered counts and association lookup.
- [ ] 2.2 Implement product service create/update rules for duplicate active products, non-negative price, non-negative stock and valid active categories/ingredients.
- [ ] 2.3 Implement category association replacement only when `category_ids` is explicitly supplied.
- [ ] 2.4 Implement ingredient composition replacement only when ingredient composition is explicitly supplied, preserving `is_removable` values.
- [ ] 2.5 Implement product soft delete with default-read exclusion and replacement-after-delete behavior.
- [ ] 2.6 Implement filters for search, category, ingredient, active inclusion, availability and stock state.
- [ ] 2.7 Add stable product error codes using the canonical problem contract.

## 3. Cross-Catalog Deletion Rules

- [ ] 3.1 Extend category deletion logic to reject deletion when active non-deleted products reference the category.
- [ ] 3.2 Extend ingredient deletion logic to reject deletion when active non-deleted products reference the ingredient.
- [ ] 3.3 Add repository/UoW support for category and ingredient product-reference checks without introducing circular imports.
- [ ] 3.4 Add backend tests for category-has-products and ingredient-has-products conflict errors.

## 4. Backend API and Authorization

- [ ] 4.1 Add ADMIN-protected product routes for list, detail, create, update and delete under `/api/v1/admin/products`.
- [ ] 4.2 Wire product router into `backend/app/api/router.py`.
- [ ] 4.3 Wire product repositories into `backend/app/core/uow.py` and model imports into `backend/app/core/database.py`.
- [ ] 4.4 Add API tests for ADMIN success paths and anonymous/non-admin 401/403 behavior.
- [ ] 4.5 Add service/API tests for duplicates, invalid category ids, invalid ingredient ids, association replacement, stock/availability semantics and product not-found cases.

## 5. Frontend Product Administration

- [ ] 5.1 Add product route metadata and ADMIN navigation entry for `/admin/products`.
- [ ] 5.2 Add product API client and TypeScript types for products, category payloads and ingredient composition.
- [ ] 5.3 Add TanStack Query key factories, list/detail query hooks and mutation hooks with targeted invalidation.
- [ ] 5.4 Add product management page with list, search/filter controls, loading, empty and error states.
- [ ] 5.5 Add product create/edit form with name, description, price, stock quantity, active flag, availability flag and category multi-select.
- [ ] 5.6 Add ingredient composition editor with ingredient multi-select and per-product `is_removable` controls.
- [ ] 5.7 Add delete confirmation and canonical error rendering for duplicate, invalid-category, invalid-ingredient, price and stock failures.

## 6. Frontend Tests and UX Verification

- [ ] 6.1 Add route/access tests proving only ADMIN can reach product management UI.
- [ ] 6.2 Add UI tests for loading products and rendering category, ingredient, availability and stock state badges.
- [ ] 6.3 Add UI tests for creating and editing products with category and ingredient composition invalidation.
- [ ] 6.4 Add UI tests for filtering by search/category/ingredient/availability/stock state.
- [ ] 6.5 Add UI tests for validation errors preserving form state.
- [ ] 6.6 Verify accessible form labels, buttons, dialogs, error messages and navigation state.

## 7. Final Verification

- [ ] 7.1 Run backend targeted tests for products, categories, ingredients, migrations, auth/RBAC and canonical errors.
- [ ] 7.2 Run frontend typecheck and targeted product/category/ingredient/router tests; do not run production build.
- [ ] 7.3 Update `verify-report.md` with task completion, test results, spec compliance and design coherence.
