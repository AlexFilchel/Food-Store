## ADDED Requirements

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

## MODIFIED Requirements

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
