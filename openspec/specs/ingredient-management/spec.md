# ingredient-management Specification

## Purpose
TBD - created by archiving change ingredient-management. Update Purpose after archive.
## Requirements
### Requirement: Ingredient persistence
The system SHALL persist ingredients as catalog records with audit fields, active status and soft delete support.

#### Scenario: Ingredient is created
- **WHEN** an ADMIN creates an ingredient with a unique name
- **THEN** the system stores the ingredient with audit timestamps, active status and no deleted timestamp

#### Scenario: Duplicate active ingredient is rejected
- **WHEN** an ADMIN creates or updates an ingredient so another active non-deleted ingredient has the same normalized identity
- **THEN** the system rejects the request with the canonical error contract and a stable duplicate-ingredient code

#### Scenario: Replacement after ingredient soft delete is allowed
- **WHEN** an ingredient was soft-deleted
- **THEN** an ADMIN can create a new active ingredient with the same normalized identity

### Requirement: Allergen persistence
The system SHALL persist allergens as catalog records with audit fields, active status and soft delete support.

#### Scenario: Allergen is created
- **WHEN** an ADMIN creates an allergen with a unique name
- **THEN** the system stores the allergen with audit timestamps, active status and no deleted timestamp

#### Scenario: Duplicate active allergen is rejected
- **WHEN** an ADMIN creates or updates an allergen so another active non-deleted allergen has the same normalized identity
- **THEN** the system rejects the request with the canonical error contract and a stable duplicate-allergen code

#### Scenario: Replacement after allergen soft delete is allowed
- **WHEN** an allergen was soft-deleted and is no longer referenced by active ingredients
- **THEN** an ADMIN can create a new active allergen with the same normalized identity

### Requirement: Ingredient allergen associations
The system SHALL allow ingredients to reference zero or more active allergens through managed associations, while product-specific removability remains on the product-ingredient association.

#### Scenario: Ingredient is created with allergens
- **WHEN** an ADMIN creates an ingredient with valid active allergen ids
- **THEN** the system stores the ingredient and returns it with the associated allergen payloads

#### Scenario: Ingredient allergens are replaced on update
- **WHEN** an ADMIN updates an ingredient with a supplied `allergen_ids` list
- **THEN** the system replaces the ingredient's allergen associations with exactly that list

#### Scenario: Missing or deleted allergen is rejected
- **WHEN** an ADMIN creates or updates an ingredient with a missing, inactive or soft-deleted allergen id
- **THEN** the system rejects the request with the canonical error contract and a stable invalid-allergen code

#### Scenario: Ingredient update can leave allergens unchanged
- **WHEN** an ADMIN updates ingredient fields without supplying `allergen_ids`
- **THEN** the system updates only the supplied fields and preserves existing allergen associations

#### Scenario: Global ingredient does not define removability
- **WHEN** an ADMIN creates or updates a global ingredient
- **THEN** the system does not store product-specific removability on the ingredient itself

### Requirement: Ingredient CRUD API
The system SHALL provide ADMIN-protected backend APIs to create, read, update, list and soft delete ingredients.

#### Scenario: ADMIN manages ingredients
- **WHEN** an authenticated user with role `ADMIN` calls ingredient management endpoints with valid data
- **THEN** the system performs the requested operation and returns canonical ingredient payloads

#### Scenario: Ingredient list is requested
- **WHEN** an ADMIN requests the ingredient list with pagination and optional filters
- **THEN** the system returns the canonical paginated response excluding soft-deleted ingredients by default

#### Scenario: Ingredient detail is requested
- **WHEN** an ADMIN requests an existing non-deleted ingredient by id
- **THEN** the system returns the ingredient including its associated allergens

#### Scenario: Ingredient not found is handled
- **WHEN** an ADMIN requests, updates or deletes a missing or soft-deleted ingredient
- **THEN** the system rejects the request with the canonical error contract and a stable ingredient-not-found code

#### Scenario: Non-admin user is rejected for ingredients
- **WHEN** an authenticated user without role `ADMIN` calls ingredient management endpoints
- **THEN** the system rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Anonymous user is rejected for ingredients
- **WHEN** a request without valid authentication calls ingredient management endpoints
- **THEN** the system rejects the request with HTTP 401 using the canonical error contract

### Requirement: Allergen CRUD API
The system SHALL provide ADMIN-protected backend APIs to create, read, update, list and soft delete allergens.

#### Scenario: ADMIN manages allergens
- **WHEN** an authenticated user with role `ADMIN` calls allergen management endpoints with valid data
- **THEN** the system performs the requested operation and returns canonical allergen payloads

#### Scenario: Allergen list is requested
- **WHEN** an ADMIN requests the allergen list with pagination and optional filters
- **THEN** the system returns the canonical paginated response excluding soft-deleted allergens by default

#### Scenario: Allergen not found is handled
- **WHEN** an ADMIN requests, updates or deletes a missing or soft-deleted allergen
- **THEN** the system rejects the request with the canonical error contract and a stable allergen-not-found code

#### Scenario: Non-admin user is rejected for allergens
- **WHEN** an authenticated user without role `ADMIN` calls allergen management endpoints
- **THEN** the system rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Anonymous user is rejected for allergens
- **WHEN** a request without valid authentication calls allergen management endpoints
- **THEN** the system rejects the request with HTTP 401 using the canonical error contract

### Requirement: Soft delete behavior and allergen deletion restrictions
The system SHALL soft delete ingredients and allergens while preventing unsafe deletion when active catalog records still reference them.

#### Scenario: Ingredient soft delete hides ingredient
- **WHEN** an ADMIN deletes an ingredient that is not referenced by active non-deleted products
- **THEN** the system sets `deleted_at` and excludes the ingredient from default list and detail operations

#### Scenario: Ingredient referenced by active product cannot be deleted
- **WHEN** an ADMIN attempts to delete an ingredient referenced by at least one active non-deleted product
- **THEN** the system rejects the request with HTTP 409 and a stable ingredient-has-products code

#### Scenario: Allergen soft delete hides allergen
- **WHEN** an ADMIN deletes an allergen that is not referenced by active ingredients
- **THEN** the system sets `deleted_at` and excludes the allergen from default list and detail operations

#### Scenario: Allergen referenced by active ingredient cannot be deleted
- **WHEN** an ADMIN attempts to delete an allergen referenced by at least one active non-deleted ingredient
- **THEN** the system rejects the request with HTTP 409 and a stable allergen-in-use code

#### Scenario: Inactive records are included only when requested
- **WHEN** an ADMIN requests ingredients or allergens with `include_inactive=true`
- **THEN** inactive but not soft-deleted records are included in the response

### Requirement: Admin ingredient frontend
The system SHALL provide an ADMIN-only frontend experience for ingredient and allergen administration.

#### Scenario: ADMIN opens ingredient management page
- **WHEN** an authenticated ADMIN navigates to the ingredient management route
- **THEN** the frontend displays ingredient and allergen administration data loaded from the backend

#### Scenario: Non-admin cannot use ingredient management UI
- **WHEN** an authenticated user without role `ADMIN` navigates to the ingredient management route
- **THEN** the frontend blocks the route using the existing access-denied experience

#### Scenario: ADMIN creates or edits ingredient
- **WHEN** an ADMIN submits valid ingredient form data with zero or more allergens
- **THEN** the frontend calls the ingredient API, invalidates ingredient queries and reflects the saved ingredient

#### Scenario: ADMIN creates or edits allergen
- **WHEN** an ADMIN submits valid allergen form data
- **THEN** the frontend calls the allergen API, invalidates allergen and affected ingredient queries and reflects the saved allergen

#### Scenario: ADMIN sees validation errors
- **WHEN** the backend rejects an ingredient or allergen request due to duplicate, invalid allergen or in-use deletion rules
- **THEN** the frontend displays a useful error without losing form state

### Requirement: Ingredient and allergen vertical form layout
The system SHALL present ingredient and allergen management forms as stacked full-width workflow blocks, not side-by-side columns.

#### Scenario: Ingredient form appears first and full width
- **GIVEN** an authenticated ADMIN navigates to ingredient management
- **WHEN** the ingredient administration page renders
- **THEN** the ingredient create/edit form appears first as a full-width block
- **AND** it is not placed in a side-by-side column next to the allergen form or ingredient list.

#### Scenario: Allergen form appears below and full width
- **GIVEN** the ingredient form is visible
- **WHEN** the ADMIN continues through the page
- **THEN** the allergen create/edit form appears below the ingredient form as a full-width block
- **AND** the primary submit buttons preserve their current primary visual treatment.

#### Scenario: Ingredient and allergen fields are grouped cleanly
- **GIVEN** an ADMIN creates or edits ingredients or allergens
- **WHEN** the forms render across responsive breakpoints
- **THEN** name, description, active state, and allergen association controls use clear rows or stacked groups
- **AND** labels, helper text, and error feedback remain associated with their controls.

### Requirement: Ingredient and allergen administrative grids
The system SHALL show ingredients and allergens below the forms as administrative grids or tables with clear states, associations, empty states, and actions.

#### Scenario: Ingredient grid shows state and associated allergens
- **GIVEN** ingredients are loaded for an ADMIN
- **WHEN** the ingredients grid renders
- **THEN** it displays headers or equivalent accessible labels for ingredient identity, state, associated allergens, and actions
- **AND** associated allergens are shown as compact badges or equivalent readable tokens.

#### Scenario: Allergen grid shows state and actions
- **GIVEN** allergens are loaded for an ADMIN
- **WHEN** the allergens grid renders
- **THEN** it displays headers or equivalent accessible labels for allergen identity, state, and actions
- **AND** active or inactive state is shown with a badge.

#### Scenario: Ingredient and allergen grids preserve operational states
- **GIVEN** ingredients or allergens are loading, empty, or fail to load
- **WHEN** the related grid renders
- **THEN** loading, empty, and error states remain visible within the appropriate section
- **AND** Edit and Delete actions remain grouped at the end of each row and right-aligned on desktop layouts.

