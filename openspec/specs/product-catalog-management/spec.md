# product-catalog-management Specification

## Purpose
TBD - created by archiving change product-catalog-management. Update Purpose after archive.
## Requirements
### Requirement: Product persistence
The system SHALL persist products as sellable catalog records with audit fields, soft delete support, price, stock quantity, active status and availability status.

#### Scenario: Product is created
- **WHEN** an ADMIN creates a product with valid name, price and stock quantity
- **THEN** the system stores it with audit timestamps, active status, availability status and no deleted timestamp

#### Scenario: Duplicate active product is rejected
- **WHEN** an ADMIN creates or updates a product so another active non-deleted product has the same normalized identity
- **THEN** the system rejects the request with the canonical error contract and a stable duplicate-product code

#### Scenario: Replacement after product soft delete is allowed
- **WHEN** a product was soft-deleted
- **THEN** an ADMIN can create a new active product with the same normalized identity

#### Scenario: Invalid price or stock is rejected
- **WHEN** an ADMIN creates or updates a product with a negative price or negative stock quantity
- **THEN** the system rejects the request with the canonical error contract and stable validation error codes

### Requirement: Product category associations
The system SHALL allow products to reference one or more active non-deleted categories.

#### Scenario: Product is created with categories
- **WHEN** an ADMIN creates a product with valid active category ids
- **THEN** the system stores the product and returns it with associated category payloads

#### Scenario: Product categories are replaced on update
- **WHEN** an ADMIN updates a product with a supplied `category_ids` list
- **THEN** the system replaces the product's category associations with exactly that list

#### Scenario: Missing or deleted category is rejected
- **WHEN** an ADMIN creates or updates a product with a missing, inactive or soft-deleted category id
- **THEN** the system rejects the request with the canonical error contract and a stable invalid-category code

#### Scenario: Product update can leave categories unchanged
- **WHEN** an ADMIN updates product fields without supplying `category_ids`
- **THEN** the system updates only the supplied fields and preserves existing category associations

### Requirement: Product ingredient composition
The system SHALL allow products to reference zero or more active non-deleted ingredients with product-specific removability metadata.

#### Scenario: Product is created with ingredient composition
- **WHEN** an ADMIN creates a product with valid ingredient composition entries
- **THEN** the system stores the product and returns associated ingredients including each `is_removable` value

#### Scenario: Product ingredient composition is replaced on update
- **WHEN** an ADMIN updates a product with a supplied ingredient composition list
- **THEN** the system replaces the product's ingredient associations with exactly that list and removability values

#### Scenario: Missing or deleted ingredient is rejected
- **WHEN** an ADMIN creates or updates a product with a missing, inactive or soft-deleted ingredient id
- **THEN** the system rejects the request with the canonical error contract and a stable invalid-ingredient code

#### Scenario: Product update can leave ingredients unchanged
- **WHEN** an ADMIN updates product fields without supplying ingredient composition
- **THEN** the system updates only the supplied fields and preserves existing ingredient associations

### Requirement: Product CRUD API
The system SHALL provide ADMIN-protected backend APIs to create, read, update, list and soft delete products.

#### Scenario: ADMIN manages products
- **WHEN** an authenticated user with role `ADMIN` calls product management endpoints with valid data
- **THEN** the system performs the requested operation and returns canonical product payloads

#### Scenario: Product list is requested
- **WHEN** an ADMIN requests the product list with pagination and optional filters
- **THEN** the system returns the canonical paginated response excluding soft-deleted products by default

#### Scenario: Product detail is requested
- **WHEN** an ADMIN requests an existing non-deleted product by id
- **THEN** the system returns the product including categories and ingredient composition

#### Scenario: Product not found is handled
- **WHEN** an ADMIN requests, updates or deletes a missing or soft-deleted product
- **THEN** the system rejects the request with the canonical error contract and a stable product-not-found code

#### Scenario: Non-admin user is rejected for products
- **WHEN** an authenticated user without role `ADMIN` calls product management endpoints
- **THEN** the system rejects the request with HTTP 403 using the canonical error contract

#### Scenario: Anonymous user is rejected for products
- **WHEN** a request without valid authentication calls product management endpoints
- **THEN** the system rejects the request with HTTP 401 using the canonical error contract

### Requirement: Product filtering and state semantics
The system SHALL support product administration filters and SHALL keep availability, stock and soft delete as distinct product states.

#### Scenario: Product list is filtered by category or ingredient
- **WHEN** an ADMIN requests products with a category or ingredient filter
- **THEN** the system returns only matching non-deleted products in canonical paginated form

#### Scenario: Product list is filtered by availability
- **WHEN** an ADMIN requests products by availability state
- **THEN** the system filters by `is_available` without treating stock quantity or soft delete as equivalent

#### Scenario: Product list is filtered by stock state
- **WHEN** an ADMIN requests products by stock state
- **THEN** the system differentiates in-stock products from out-of-stock products using `stock_quantity`

#### Scenario: Unavailable product with stock remains distinct
- **WHEN** a product has `is_available=false` and `stock_quantity` greater than zero
- **THEN** the system preserves both values and exposes the product as unavailable but not out of stock

#### Scenario: Out-of-stock available product remains distinct
- **WHEN** a product has `is_available=true` and `stock_quantity=0`
- **THEN** the system preserves both values and exposes the product as available but out of stock

#### Scenario: Soft-deleted product is hidden
- **WHEN** an ADMIN deletes a product
- **THEN** the system sets `deleted_at` and excludes the product from default list and detail operations regardless of availability or stock

#### Scenario: Inactive products are included only when requested
- **WHEN** an ADMIN requests products with `include_inactive=true`
- **THEN** inactive but not soft-deleted products are included in the response

#### Scenario: Admin views inactive products via UI toggle
- **WHEN** an ADMIN enables the "Incluir inactivos" filter on the product list
- **THEN** the product list includes products with `is_active=false` alongside active products

#### Scenario: Product list defaults to active only
- **WHEN** an ADMIN loads the product list without enabling the inactive filter
- **THEN** only active products are shown

#### Scenario: Admin filters products by category dropdown
- **WHEN** an ADMIN selects a category from the product list category dropdown filter
- **THEN** only products belonging to that category are shown

### Requirement: Admin product frontend
The system SHALL provide an ADMIN-only frontend experience for product catalog administration.

#### Scenario: ADMIN creates or edits product
- **WHEN** an ADMIN submits valid product form data with categories and ingredient composition
- **THEN** the frontend calls the product API, invalidates product queries and reflects the saved product

#### Scenario: ADMIN sees validation errors
- **WHEN** the backend rejects a product request due to duplicate, invalid category, invalid ingredient, price or stock validation
- **THEN** the frontend displays a useful error without losing form state

#### Scenario: Product form preserves state on validation error
- **WHEN** an ADMIN submits a product form and the backend rejects it
- **THEN** the frontend displays the error message and preserves all entered form data

#### Scenario: Product form resets only on success
- **WHEN** an ADMIN submits a product form and the backend accepts it
- **THEN** the frontend resets the form and reflects the saved product

### Requirement: Allergen checkbox selection
The system SHALL provide checkbox-based selection for allergens on the ingredient form, avoiding keyboard modifier dependencies.

#### Scenario: Admin selects allergens via checkboxes
- **WHEN** an ADMIN creates or edits an ingredient
- **THEN** allergens are presented as a list of checkboxes, one per allergen, allowing multi-selection without Ctrl+Click

### Requirement: Stock field constraint hint
The system SHALL display a hint text on the stock quantity field indicating the non-negative constraint.

#### Scenario: Stock field displays constraint hint
- **WHEN** an ADMIN views the product form stock quantity field
- **THEN** a hint text indicates "El stock no puede ser negativo (mín. 0)"

### Requirement: Category card text layout
The system SHALL display category information in cards without text overflow or cramped layout.

#### Scenario: Category card handles long text
- **WHEN** a category has a long name or description
- **THEN** the card displays the text with proper truncation or word wrapping without breaking the layout

### Requirement: Product filters and full-width form layout
The system SHALL keep product filters above the product workflow and present product creation/editing as a full-width block.

#### Scenario: Product filters remain above product workflow
- **GIVEN** an authenticated ADMIN navigates to product management
- **WHEN** the product administration page renders
- **THEN** search, category, availability, stock, and inactive filters remain above the form and list area
- **AND** the filter controls use a responsive layout that stacks or wraps cleanly on narrow viewports.

#### Scenario: Product form appears full width before the list
- **GIVEN** the product administration page is visible
- **WHEN** the create/edit product form renders
- **THEN** it appears as a full-width block above the product grid/list
- **AND** it is not placed as a lateral column beside the product list.

#### Scenario: Product form fields are distributed for scanning
- **GIVEN** the product create/edit form is visible
- **WHEN** the viewport supports grouped fields
- **THEN** name is emphasized as a wide field, description spans the form width, price and stock share a row, active and available controls share a row, and categories and ingredients are balanced in the form layout
- **AND** the layout stacks without losing labels, helper text, or validation feedback on narrow viewports.

### Requirement: Product administrative grid
The system SHALL show products below the form in an administrative grid or table optimized for catalog operations.

#### Scenario: Product grid exposes operational columns
- **GIVEN** products are loaded for an ADMIN
- **WHEN** the product list area renders
- **THEN** it displays headers or equivalent accessible labels for name, price, stock, availability, state, categories, ingredients, and actions
- **AND** each product is displayed as a row with subtle dividers rather than as a standalone rounded card.

#### Scenario: Product grid uses badges for key states
- **GIVEN** a product row is visible
- **WHEN** the ADMIN reviews catalog state
- **THEN** availability, stock, active/inactive state, categories, and ingredients are shown with compact badges or equivalent readable tokens
- **AND** stock and availability remain visually distinct states.

#### Scenario: Product row actions and empty states remain clear
- **GIVEN** product data is loaded, empty, loading, or failed
- **WHEN** the product grid renders
- **THEN** loading, empty, and error states remain visible in the product section
- **AND** Edit and Delete actions are grouped at the end of each row and right-aligned on desktop layouts.

