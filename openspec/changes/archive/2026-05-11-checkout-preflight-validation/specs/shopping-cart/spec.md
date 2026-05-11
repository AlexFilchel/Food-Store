## ADDED Requirements

### Requirement: Cart checkout preflight handoff
The system SHALL connect the cart review UI to authenticated checkout preflight while preserving local cart behavior.

#### Scenario: Populated cart starts checkout preflight
- **WHEN** an authenticated user clicks checkout from a populated cart
- **THEN** the frontend submits the cart checkout payload to the checkout preflight flow without clearing local cart contents

#### Scenario: Anonymous cart checkout requires login
- **WHEN** an anonymous user clicks checkout from a populated cart
- **THEN** the frontend sends the user to login or shows login-required UI and preserves the cart contents

#### Scenario: Successful preflight keeps cart until order creation
- **WHEN** checkout preflight returns a valid summary
- **THEN** the frontend displays the summary and does not clear the cart because no order has been created yet
