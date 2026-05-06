## Why

Products need explicit ingredient and allergen data before the catalog can safely expose composition, dietary restrictions and customization rules. This change introduces the administrative foundation for managing ingredients and allergens now that auth/RBAC and the protected frontend shell are available.

## What Changes

- Add ingredient persistence with audit fields, active flag and soft delete.
- Add allergen persistence with audit fields, active flag and soft delete.
- Add ingredient-to-allergen associations so each ingredient can declare zero or more allergens.
- Add ADMIN-protected backend CRUD endpoints for ingredients and allergens.
- Support paginated lists, detail reads, filtering and deterministic ordering for administration.
- Enforce duplicate-name/slug rules among active non-deleted ingredients and allergens.
- Restrict unsafe allergen deletion while active ingredients still reference the allergen.
- Add admin frontend screens for listing, creating, editing, linking allergens and soft-deleting ingredients/allergens.
- No product-ingredient association, product removability rule or public allergen filtering is introduced yet.

## Capabilities

### New Capabilities
- `ingredient-management`: Administrative management of ingredients, allergens and ingredient-allergen associations, including CRUD, soft delete, RBAC-protected APIs and frontend admin UI.

### Modified Capabilities

None.

## Impact

- `backend/app/modules/ingredients/*`: new models, schemas, repository, service, errors and router.
- `backend/alembic/versions/*`: migration for `ingredients`, `allergens` and `ingredient_allergens` tables, indexes and active uniqueness constraints.
- `backend/app/core/database.py`: import ingredient/allergen models for metadata discovery.
- `backend/app/core/uow.py`: expose ingredient repositories through the Unit of Work.
- `backend/app/api/router.py`: include ingredient management router.
- `backend/tests/*`: backend tests for CRUD, associations, uniqueness, soft delete, RBAC and migrations.
- `frontend/src/app/routes/route-config.ts`: add admin ingredient route/navigation metadata.
- `frontend/src/entities/*`, `frontend/src/features/*`, `frontend/src/pages/*`: ingredient/allergen API client, types, TanStack Query hooks and admin UI.
- `openspec/specs/ingredient-management/spec.md`: new capability after archive.
