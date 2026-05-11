# category-management Specification

## Purpose
TBD - created by archiving change category-management. Update Purpose after archive.
## Requirements
### Requirement: Category persistence and hierarchy
The system SHALL persist product categories as hierarchical records with audit fields, soft delete support and optional parent category references.

#### Scenario: Root category is created
- **WHEN** an ADMIN creates a category without `parent_id`
- **THEN** the system stores it as a root category with audit timestamps and no deleted timestamp

#### Scenario: Child category is created
- **WHEN** an ADMIN creates a category with an existing active `parent_id`
- **THEN** the system stores it as a child of that parent

#### Scenario: Missing or deleted parent is rejected
- **WHEN** an ADMIN creates or updates a category with a missing or soft-deleted parent
- **THEN** the system rejects the request with the canonical error contract and a stable invalid-parent code

### Requirement: Category CRUD API
The system SHALL provide ADMIN-protected backend APIs to create, read, update, list and soft delete categories.

#### Scenario: ADMIN manages categories
- **WHEN** an authenticated user with role `ADMIN` calls category management endpoints with valid data
- **THEN** the system performs the requested operation and returns canonical category payloads

#### Scenario: Non-admin user is rejected
- **WHEN** an authenticated user without role `ADMIN` calls category management endpoints
- **THEN** the system rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Anonymous user is rejected
- **WHEN** a request without valid authentication calls category management endpoints
- **THEN** the system rejects the request with HTTP 401 using the canonical error contract

### Requirement: Category listing and tree view
The system SHALL expose category data as both paginated flat lists and hierarchical tree data for administration.

#### Scenario: Paginated category list is requested
- **WHEN** an ADMIN requests the category list with `page` and `size`
- **THEN** the system returns the canonical paginated response excluding soft-deleted categories by default

#### Scenario: Category tree is requested
- **WHEN** an ADMIN requests the category tree
- **THEN** the system returns root categories with nested active children in deterministic order

#### Scenario: Inactive categories are included
- **WHEN** an ADMIN requests categories with `include_inactive=true`
- **THEN** inactive but not soft-deleted categories are included in the response

### Requirement: Hierarchy integrity validation
The system SHALL prevent invalid hierarchy mutations including self-parenting and ancestry cycles.

#### Scenario: Category cannot parent itself
- **WHEN** an ADMIN attempts to set a category parent to its own id
- **THEN** the system rejects the request with a stable cycle-detected or invalid-parent code

#### Scenario: Category cannot move under descendant
- **WHEN** an ADMIN attempts to move a category under one of its descendants
- **THEN** the system rejects the request with a stable cycle-detected code

#### Scenario: Category can move to valid parent
- **WHEN** an ADMIN moves a category under an unrelated active category
- **THEN** the system updates the parent and preserves a valid acyclic hierarchy

### Requirement: Category uniqueness and soft delete behavior
The system SHALL prevent duplicate active sibling categories and SHALL soft delete categories instead of hard deleting them.

#### Scenario: Duplicate sibling category is rejected
- **WHEN** an ADMIN creates or updates a category so another active sibling has the same normalized slug or name identity
- **THEN** the system rejects the request with the canonical error contract and a stable duplicate-category code

#### Scenario: Soft-deleted category is hidden
- **WHEN** a category has been deleted through the category delete endpoint
- **THEN** default list, detail and tree operations do not return that category

#### Scenario: Replacement after soft delete is allowed
- **WHEN** a category was soft-deleted
- **THEN** an ADMIN can create a new active sibling with the same normalized identity

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

### Requirement: Admin category frontend
The system SHALL provide an ADMIN-only frontend experience for category administration.

#### Scenario: ADMIN opens category management page
- **WHEN** an authenticated ADMIN navigates to the category management route
- **THEN** the frontend displays category list or tree data loaded from the backend

#### Scenario: Non-admin cannot use category management UI
- **WHEN** an authenticated user without role `ADMIN` navigates to the category management route
- **THEN** the frontend blocks the route using the existing access-denied experience

#### Scenario: ADMIN creates or edits category
- **WHEN** an ADMIN submits valid category form data
- **THEN** the frontend calls the category API, invalidates category queries and reflects the saved category

#### Scenario: ADMIN sees validation errors
- **WHEN** the category API rejects a create, update or delete request due to hierarchy, duplicate or child restrictions
- **THEN** the frontend displays a useful error without losing form state

### Requirement: Category admin full-width form layout
The system SHALL present category creation and editing as a full-width top workflow block instead of a lateral column.

#### Scenario: ADMIN creates a category from a full-width top block
- **GIVEN** an authenticated ADMIN navigates to category management
- **WHEN** the category administration page renders
- **THEN** the `Crear categoría` form appears above the category administration grid/list area as a full-width block
- **AND** it does not occupy a right-side lateral column beside the category list.

#### Scenario: Category form fields are responsively organized
- **GIVEN** the category create/edit form is visible
- **WHEN** the viewport supports multiple columns
- **THEN** name is presented prominently, description can span the form width, and parent/order/state controls are grouped into clear responsive rows
- **AND** on narrow viewports the same fields stack without losing labels or validation messages.

### Requirement: Category administrative grid
The system SHALL show categories below the form in an administrative grid or table optimized for scanning and operations.

#### Scenario: Category grid exposes administrative columns
- **GIVEN** categories are loaded for an ADMIN
- **WHEN** the category list area renders
- **THEN** it displays headers or equivalent accessible labels for name, slug or code, state, parent, order, updated at, and actions
- **AND** each category is displayed as a row with subtle dividers rather than as a standalone rounded card.

#### Scenario: Category row actions and state badges are clear
- **GIVEN** a category row is visible
- **WHEN** the ADMIN reviews available operations
- **THEN** active or inactive state is shown with a badge
- **AND** Edit and Delete actions are grouped at the end of the row and right-aligned on desktop layouts.

#### Scenario: Category empty and support views remain available
- **GIVEN** no categories are returned or hierarchy context is needed
- **WHEN** the category page renders
- **THEN** the page shows the existing empty/loading/error feedback as appropriate
- **AND** hierarchy/tree context remains available without replacing the primary administrative grid.

