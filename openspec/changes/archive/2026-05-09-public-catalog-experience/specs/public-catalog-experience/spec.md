## ADDED Requirements

### Requirement: Public product listing API
The system SHALL expose a public product listing endpoint that returns only sellable products using the canonical pagination contract.

#### Scenario: Anonymous user lists sellable products
- **WHEN** an anonymous client requests the public product listing endpoint with valid `page` and `size`
- **THEN** the API returns `items`, `total`, `page`, `size` and `pages` containing only products that are active, available, not soft-deleted and in stock

#### Scenario: Non-sellable products are hidden
- **WHEN** a product is inactive, unavailable, soft-deleted or has `stock_quantity` equal to zero
- **THEN** the public listing endpoint does not include that product

#### Scenario: Public product list uses canonical errors
- **WHEN** public listing query parameters fail validation
- **THEN** the API returns the canonical RFC 7807 error contract with stable validation codes

### Requirement: Public catalog filters
The system SHALL allow public catalog users to filter products by search term and category using the same canonical pagination parameters as other list endpoints.

#### Scenario: Product list is filtered by search
- **WHEN** an anonymous client requests the public listing with a search term
- **THEN** the API returns only sellable products whose searchable public fields match the term

#### Scenario: Product list is filtered by category
- **WHEN** an anonymous client requests the public listing with a category id
- **THEN** the API returns only sellable products associated with that active non-deleted category

#### Scenario: Empty public filter result
- **WHEN** public filters match no sellable products
- **THEN** the API returns an empty `items` array with valid pagination metadata

### Requirement: Public product detail API
The system SHALL expose a public product detail endpoint that returns a sellable product with public categories and ingredient composition.

#### Scenario: Anonymous user views product detail
- **WHEN** an anonymous client requests the detail of a sellable product
- **THEN** the API returns its public name, slug, description, price, categories and ingredients with removability metadata

#### Scenario: Non-sellable product detail is hidden
- **WHEN** an anonymous client requests an inactive, unavailable, out-of-stock or soft-deleted product
- **THEN** the API returns the canonical not-found error instead of exposing the product

#### Scenario: Missing product detail is handled
- **WHEN** an anonymous client requests a product that does not exist
- **THEN** the API returns the canonical not-found error with a stable public product not found code

### Requirement: Public catalog frontend
The system SHALL provide a public frontend catalog experience from the home route with product cards, filters and pagination-aware data loading.

#### Scenario: Anonymous user opens the home page
- **WHEN** an anonymous user navigates to `/`
- **THEN** the frontend renders the public catalog without requiring authentication

#### Scenario: Catalog displays products
- **WHEN** the public listing API returns products
- **THEN** the frontend renders product cards with name, price, categories and availability-safe call to action toward detail

#### Scenario: Catalog handles loading, error and empty states
- **WHEN** the public catalog request is loading, fails or returns no products
- **THEN** the frontend displays a clear loading, error or empty state without crashing the app

#### Scenario: Catalog filters products
- **WHEN** the user changes the search term or category filter
- **THEN** the frontend requests the public catalog with updated filters and renders the resulting page

### Requirement: Public product detail frontend
The system SHALL provide a public product detail experience reachable from the catalog list.

#### Scenario: User opens a product detail
- **WHEN** the user selects a product from the public catalog
- **THEN** the frontend navigates to a public detail page and displays product description, price, categories and ingredient composition

#### Scenario: Product detail handles missing product
- **WHEN** the detail API returns not found
- **THEN** the frontend displays a not-found or recoverable empty detail experience without exposing internal errors

#### Scenario: Product detail does not require authentication
- **WHEN** an anonymous user directly opens a public product detail URL
- **THEN** the frontend renders the detail route without redirecting to login
