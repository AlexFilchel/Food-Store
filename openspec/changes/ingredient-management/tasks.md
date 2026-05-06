## 1. Backend Data Model and Migration

- [x] 1.1 Add `ingredients` backend module structure with models, schemas, repository, service, errors and router files.
- [x] 1.2 Create ingredient and allergen SQLModel models with audit fields, soft delete, active flag, name and slug.
- [x] 1.3 Create ingredient-allergen association model/table with composite uniqueness and foreign keys.
- [x] 1.4 Add Alembic migration for `ingredients`, `allergens`, `ingredient_allergens`, lookup indexes and active uniqueness indexes.
- [x] 1.5 Add migration tests for upgrade/downgrade, association constraints and PostgreSQL-safe partial index predicates.

## 2. Backend Ingredient and Allergen Domain Logic

- [x] 2.1 Implement repository queries for ingredient list/detail, allergen list/detail, active slug lookup and association lookup.
- [x] 2.2 Implement ingredient service create/update rules for duplicate active ingredients and valid active allergen ids.
- [x] 2.3 Implement association replacement only when `allergen_ids` is explicitly supplied on update.
- [x] 2.4 Implement ingredient soft delete with default-read exclusion.
- [x] 2.5 Implement allergen service create/update duplicate validation and soft delete with active-ingredient reference restriction.
- [x] 2.6 Add stable ingredient/allergen error codes using the canonical problem contract.

## 3. Backend API and Authorization

- [x] 3.1 Add ADMIN-protected ingredient routes for list, detail, create, update and delete under `/api/v1/admin/ingredients`.
- [x] 3.2 Add ADMIN-protected allergen routes for list, detail, create, update and delete under `/api/v1/admin/allergens`.
- [x] 3.3 Wire ingredient/allergen router into `backend/app/api/router.py`.
- [x] 3.4 Wire ingredient repositories into `backend/app/core/uow.py` and model imports into `backend/app/core/database.py`.
- [x] 3.5 Add API tests for ADMIN success paths and anonymous/non-admin 401/403 behavior.
- [x] 3.6 Add service/API tests for duplicates, invalid allergen ids, association replacement, soft delete exclusion and allergen-in-use conflicts.

## 4. Frontend Ingredient Administration

- [x] 4.1 Add ingredient route metadata and ADMIN navigation entry for `/admin/ingredients`.
- [x] 4.2 Add ingredient/allergen API clients and TypeScript types.
- [x] 4.3 Add TanStack Query key factories, list/detail query hooks and mutation hooks with targeted invalidation.
- [x] 4.4 Add ingredient management page with list, search/filter controls, loading, empty and error states.
- [x] 4.5 Add ingredient create/edit form with name, description, active flag and allergen multi-select.
- [x] 4.6 Add allergen management UI with list, create/edit form and delete action.
- [x] 4.7 Add delete confirmations and canonical error rendering for duplicate, invalid-allergen and allergen-in-use failures.

## 5. Frontend Tests and UX Verification

- [x] 5.1 Add route/access tests proving only ADMIN can reach ingredient management UI.
- [x] 5.2 Add UI tests for loading ingredient/allergen data and rendering associated allergen badges.
- [x] 5.3 Add UI tests for creating, editing and deleting ingredients with query invalidation.
- [x] 5.4 Add UI tests for creating, editing and deleting allergens with affected query invalidation.
- [x] 5.5 Add UI tests for duplicate, invalid allergen and allergen-in-use errors preserving form state.
- [x] 5.6 Verify accessible form labels, buttons, dialogs, error messages and navigation state.

## 6. Final Verification

- [x] 6.1 Run backend targeted tests for ingredients, migrations, auth/RBAC and canonical errors.
- [x] 6.2 Run frontend typecheck and targeted ingredient/router tests; do not run production build.
- [x] 6.3 Update `verify-report.md` with task completion, test results, spec compliance and design coherence.
