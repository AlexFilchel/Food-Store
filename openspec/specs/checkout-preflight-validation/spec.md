# checkout-preflight-validation Specification

## Purpose
TBD - created by archiving change checkout-preflight-validation. Update Purpose after archive.
## Requirements
### Requirement: Authenticated checkout preflight API
The system SHALL expose an authenticated checkout preflight endpoint that validates cart handoff data before order creation.

#### Scenario: Authenticated customer requests preflight
- **WHEN** an authenticated customer submits a non-empty checkout payload with valid cart lines and a valid delivery address
- **THEN** the API validates the payload and returns a checkout summary without creating an order, payment or stock reservation

#### Scenario: Anonymous preflight is rejected
- **WHEN** a request without a valid bearer token calls the checkout preflight endpoint
- **THEN** the API returns HTTP 401 using the canonical error contract

#### Scenario: Empty cart payload is rejected
- **WHEN** an authenticated customer submits an empty cart payload
- **THEN** the API rejects the request with a stable empty-cart checkout error

### Requirement: Checkout product validation
The system SHALL validate checkout cart lines against current backend product state instead of trusting client snapshots.

#### Scenario: Product line is currently sellable
- **WHEN** a cart line references an active, available, non-deleted product with stock greater than or equal to requested quantity
- **THEN** the API includes that line in the checkout summary using the current product name and price from the backend

#### Scenario: Missing or non-sellable product is rejected
- **WHEN** a cart line references a missing, inactive, unavailable, soft-deleted or out-of-stock product
- **THEN** the API rejects the preflight with a canonical checkout product error that does not expose internal metadata

#### Scenario: Quantity is invalid
- **WHEN** a cart line has zero, negative or non-integer quantity
- **THEN** the API rejects the preflight with field-level validation errors in the canonical error contract

#### Scenario: Requested quantity exceeds stock
- **WHEN** a cart line quantity exceeds current product stock
- **THEN** the API rejects the preflight with a stable insufficient-stock error including safe line context

### Requirement: Checkout customization validation
The system SHALL validate removed ingredient customizations against current product ingredient composition.

#### Scenario: Removed ingredient is valid
- **WHEN** a cart line removes an ingredient that belongs to the product and is currently marked removable
- **THEN** the API accepts the customization and includes a safe customization summary in the checkout response

#### Scenario: Non-removable ingredient removal is rejected
- **WHEN** a cart line attempts to remove an ingredient that belongs to the product but is not removable
- **THEN** the API rejects the preflight with a stable invalid-customization error

#### Scenario: Foreign ingredient removal is rejected
- **WHEN** a cart line attempts to remove an ingredient that is not part of the product composition
- **THEN** the API rejects the preflight with a stable invalid-customization error

### Requirement: Checkout delivery address validation
The system SHALL validate the delivery address for the current authenticated user before returning a checkout summary.

#### Scenario: Customer selects own active address
- **WHEN** the customer submits a delivery address id belonging to their own non-deleted address
- **THEN** the API includes a public-safe delivery address snapshot preview in the checkout summary

#### Scenario: Default address is used when address id is omitted
- **WHEN** the customer omits delivery address id and has a non-deleted default address
- **THEN** the API validates and uses that default address in the checkout summary

#### Scenario: Missing default address requires explicit selection
- **WHEN** the customer omits delivery address id and has no default delivery address
- **THEN** the API rejects preflight with a stable delivery-address-required error

#### Scenario: Foreign or deleted address is hidden
- **WHEN** the customer submits a missing, deleted or another user's delivery address id
- **THEN** the API returns a canonical not-found style checkout address error without exposing ownership

### Requirement: Checkout total calculation
The system SHALL calculate checkout totals using backend Decimal-safe monetary precision.

#### Scenario: Checkout summary totals are calculated
- **WHEN** all checkout lines are valid
- **THEN** the API returns line totals and subtotal using current backend prices and stable two-decimal string values

#### Scenario: Client price snapshot is ignored
- **WHEN** the client submits stale or manipulated unit price data in the cart payload
- **THEN** the API ignores the client price and calculates totals from current backend product prices

### Requirement: Checkout preflight frontend
The system SHALL provide a frontend checkout preflight flow from the cart review UI.

#### Scenario: Anonymous user starts checkout
- **WHEN** an anonymous user clicks checkout from a populated cart
- **THEN** the frontend sends the user to login or shows login-required UI without clearing the cart

#### Scenario: Authenticated user validates checkout
- **WHEN** an authenticated user opens checkout from a populated cart and selects a valid address
- **THEN** the frontend calls the checkout preflight API and displays the returned summary

#### Scenario: Checkout validation error preserves cart
- **WHEN** the checkout preflight API rejects the cart or address
- **THEN** the frontend displays a safe actionable error and preserves the cart contents for correction

#### Scenario: Empty cart cannot run preflight
- **WHEN** the user attempts checkout with an empty cart
- **THEN** the frontend prevents the API call and shows an empty-cart state or path back to catalog

### Requirement: Checkout boundaries
The system SHALL keep checkout preflight separate from order creation and payment processing.

#### Scenario: Preflight does not persist order state
- **WHEN** checkout preflight succeeds
- **THEN** the system does not create order rows, order item rows, payment rows or payment provider preferences

#### Scenario: Preflight does not reserve stock
- **WHEN** checkout preflight succeeds
- **THEN** product stock quantities remain unchanged

