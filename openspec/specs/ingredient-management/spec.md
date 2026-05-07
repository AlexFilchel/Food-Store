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
The system SHALL allow ingredients to reference zero or more active allergens through managed associations.

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
The system SHALL soft delete ingredients and allergens while preventing unsafe allergen deletion when active ingredients still reference the allergen.

#### Scenario: Ingredient soft delete hides ingredient
- **WHEN** an ADMIN deletes an ingredient
- **THEN** the system sets `deleted_at` and excludes the ingredient from default list and detail operations

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

