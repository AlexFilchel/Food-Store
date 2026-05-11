# shopping-cart Specification

## Purpose
TBD - created by archiving change shopping-cart. Update Purpose after archive.
## Requirements
### Requirement: Cart item persistence
The system SHALL persist customer cart items locally with enough product snapshot and customization data to restore the cart after page reloads.

#### Scenario: Product is added to an empty cart
- **WHEN** a user adds a sellable public product with a valid quantity
- **THEN** the frontend stores a cart item containing product identity, display name, unit price, quantity and customization metadata

#### Scenario: Cart survives reload
- **WHEN** the user reloads or reopens the frontend after adding cart items
- **THEN** the cart restores the previously persisted items from local storage

#### Scenario: Cart can be cleared
- **WHEN** the user clears the cart
- **THEN** all cart items are removed from in-memory state and persisted storage

### Requirement: Cart line identity and customization
The system SHALL treat the same product with different removed removable ingredients as distinct cart lines.

#### Scenario: Same product and same customization increments quantity
- **WHEN** the user adds the same product with the same removed ingredient ids more than once
- **THEN** the cart merges the additions into one line and increases that line quantity

#### Scenario: Same product with different customization creates separate lines
- **WHEN** the user adds the same product with a different set of removed ingredient ids
- **THEN** the cart stores a separate cart line for that customized variant

#### Scenario: Non-removable ingredient cannot be removed from cart customization
- **WHEN** a product detail includes ingredients marked as not removable
- **THEN** the add-to-cart UI does not allow those ingredients to be selected for removal

### Requirement: Cart quantity management
The system SHALL allow users to update or remove cart line quantities without creating invalid cart state.

#### Scenario: Quantity is increased or decreased
- **WHEN** the user changes a cart line quantity to a positive integer
- **THEN** the cart updates that line and recalculates item count and subtotal totals

#### Scenario: Quantity below one removes or clamps safely
- **WHEN** the user attempts to set a cart line quantity below one
- **THEN** the cart either removes the line through an explicit remove action or clamps the quantity to the minimum valid value without storing zero or negative quantity

#### Scenario: Item is removed
- **WHEN** the user removes a cart line
- **THEN** the cart deletes only that line and leaves other product/customization variants intact

### Requirement: Cart totals
The system SHALL calculate visible cart totals from current cart lines using quantity and unit price.

#### Scenario: Cart subtotal is displayed
- **WHEN** the cart contains one or more items
- **THEN** the frontend displays total item count and subtotal amount derived from all cart lines

#### Scenario: Cart total updates after mutation
- **WHEN** the user adds, removes or changes quantity for a cart item
- **THEN** the visible totals update to match the new cart state

### Requirement: Public catalog add-to-cart UX
The system SHALL provide add-to-cart entry points from the public catalog/detail experience without requiring authentication.

#### Scenario: Anonymous user adds product from detail
- **WHEN** an anonymous user opens a sellable public product detail and chooses a valid quantity/customization
- **THEN** the frontend adds the product to the cart and shows useful success feedback

#### Scenario: Catalog call to action reaches cart-capable flow
- **WHEN** a user selects a product from the public catalog list
- **THEN** the frontend offers a path to add that product to the cart from the detail experience

#### Scenario: Add-to-cart handles missing product detail
- **WHEN** the public product detail cannot be loaded
- **THEN** the frontend does not add a cart item and shows a recoverable error or missing-product state

### Requirement: Cart review UI
The system SHALL provide a cart review UI where users can inspect and manage their current cart before checkout.

#### Scenario: User opens empty cart
- **WHEN** the cart contains no items
- **THEN** the frontend displays an empty-cart state with a path back to the catalog

#### Scenario: User opens populated cart
- **WHEN** the cart contains one or more items
- **THEN** the frontend displays each line with product name, unit price, quantity, customization summary, line subtotal and remove controls

#### Scenario: Cart checkout handoff is explicit
- **WHEN** the user reviews a populated cart
- **THEN** the frontend exposes a clear checkout handoff or placeholder without creating an order in this change

### Requirement: Cart safety and boundaries
The system SHALL keep cart behavior separate from checkout/order creation and avoid exposing internal errors.

#### Scenario: Cart does not create an order
- **WHEN** the user adds, updates, removes or clears cart items
- **THEN** the system does not create orders, payments or stock reservations

#### Scenario: Cart errors are user-safe
- **WHEN** cart UI operations fail due to invalid local input or missing product data
- **THEN** the frontend displays safe user-facing feedback without exposing tokens, stack traces or internal metadata

