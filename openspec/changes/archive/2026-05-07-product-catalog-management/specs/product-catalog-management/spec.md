## ADDED Requirements

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

### Requirement: Admin product frontend
The system SHALL provide an ADMIN-only frontend experience for product catalog administration.

#### Scenario: ADMIN opens product management page
- **WHEN** an authenticated ADMIN navigates to the product management route
- **THEN** the frontend displays product administration data loaded from the backend

#### Scenario: Non-admin cannot use product management UI
- **WHEN** an authenticated user without role `ADMIN` navigates to the product management route
- **THEN** the frontend blocks the route using the existing access-denied experience

#### Scenario: ADMIN creates or edits product
- **WHEN** an ADMIN submits valid product form data with categories and ingredient composition
- **THEN** the frontend calls the product API, invalidates product queries and reflects the saved product

#### Scenario: ADMIN filters product list
- **WHEN** an ADMIN changes product search, category, ingredient, availability or stock filters
- **THEN** the frontend requests products with matching filter parameters and displays the result state

#### Scenario: ADMIN sees validation errors
- **WHEN** the backend rejects a product request due to duplicate, invalid category, invalid ingredient, price or stock validation
- **THEN** the frontend displays a useful error without losing form state
