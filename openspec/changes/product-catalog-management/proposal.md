## Why

The business now needs the real sellable catalog: products with prices, stock, availability, categories and ingredients. Categories and ingredients exist, so this change can safely introduce product administration before public catalog, cart and checkout flows depend on it.

## What Changes

- Add product persistence with audit fields, soft delete, active/public availability flags, price and stock quantity.
- Add product-category association using the existing category hierarchy as the catalog taxonomy.
- Add product-ingredient association using existing ingredients, including product-specific removability.
- Add ADMIN-protected backend CRUD endpoints for products and product composition.
- Support paginated product administration lists with filters by search, category, ingredient, stock state and availability.
- Enforce distinct semantics for `is_available=false`, `stock_quantity=0` and soft delete.
- Prevent unsafe category/ingredient deletion while active products depend on them.
- Add admin frontend screens for listing, creating, editing, soft-deleting and managing product composition.
- No public catalog browsing, shopping cart, checkout reservation or order stock decrement is introduced yet.

## Capabilities

### New Capabilities
- `product-catalog-management`: Administrative management of sellable products, including CRUD, stock quantity, availability flags, category and ingredient associations, soft delete, RBAC-protected APIs and frontend admin UI.

### Modified Capabilities
- `category-management`: Category deletion restrictions now include active product references, not only active child categories.
- `ingredient-management`: Ingredient deletion restrictions now include active product references, and product-specific removability is modeled on the product-ingredient association.

## Impact

- `backend/app/modules/products/*`: new models, schemas, repository, service, errors and router.
- `backend/alembic/versions/*`: migration for `products`, `product_categories`, `product_ingredients`, indexes and constraints.
- `backend/app/core/database.py`: import product models for metadata discovery.
- `backend/app/core/uow.py`: expose product repositories and dependency checks through Unit of Work.
- `backend/app/modules/categories/*` and `backend/app/modules/ingredients/*`: deletion checks extended for active product references.
- `backend/app/api/router.py`: include product management router.
- `backend/tests/*`: backend tests for CRUD, stock/availability semantics, associations, deletion restrictions, RBAC and migrations.
- `frontend/src/app/routes/route-config.ts`: add admin product route/navigation metadata.
- `frontend/src/entities/*`, `frontend/src/features/*`, `frontend/src/pages/*`: product API client, types, TanStack Query hooks and admin UI.
- `openspec/specs/product-catalog-management/spec.md`: new capability after archive.
