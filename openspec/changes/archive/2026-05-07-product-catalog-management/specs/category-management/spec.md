## MODIFIED Requirements

### Requirement: Category deletion restrictions
The system SHALL prevent deletion of categories that still have active child categories or active non-deleted product references.

#### Scenario: Category with active children cannot be deleted
- **WHEN** an ADMIN attempts to delete a category that has active non-deleted child categories
- **THEN** the system rejects the request with HTTP 409 and a stable has-children code

#### Scenario: Category referenced by active product cannot be deleted
- **WHEN** an ADMIN attempts to delete a category referenced by at least one active non-deleted product
- **THEN** the system rejects the request with HTTP 409 and a stable category-has-products code

#### Scenario: Leaf category without products can be deleted
- **WHEN** an ADMIN deletes a category with no active child categories and no active non-deleted product references
- **THEN** the system sets `deleted_at` and excludes the category from default reads
