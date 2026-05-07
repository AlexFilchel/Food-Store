## MODIFIED Requirements

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
