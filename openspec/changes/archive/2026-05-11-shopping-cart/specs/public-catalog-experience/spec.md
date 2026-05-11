## ADDED Requirements

### Requirement: Catalog cart entry points
The system SHALL connect the public catalog experience to the shopping cart flow while preserving anonymous access.

#### Scenario: Product card routes to cart-capable detail
- **WHEN** an anonymous user sees a sellable product in the public catalog
- **THEN** the product card provides a call to action that reaches a product detail experience where the item can be added to the cart

#### Scenario: Catalog remains usable without cart state
- **WHEN** the cart store is empty or unavailable during initial render
- **THEN** the public catalog still renders product listing, filters and product detail navigation without requiring authentication
