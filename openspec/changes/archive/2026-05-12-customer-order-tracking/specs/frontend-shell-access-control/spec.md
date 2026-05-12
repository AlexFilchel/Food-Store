# Delta for frontend-shell-access-control

## ADDED Requirements

### Requirement: Customer order tracking routes

The authenticated frontend shell SHALL expose customer order history, order detail, creation confirmation, and payment result routes only to authenticated customer-capable sessions.

#### Scenario: Authenticated customer reaches order history
- GIVEN an authenticated user with customer access
- WHEN they navigate to the order history route
- THEN the frontend renders the customer order tracking experience inside the authenticated shell

#### Scenario: Anonymous user is redirected
- GIVEN an anonymous user
- WHEN they navigate to order history, order detail, confirmation, or payment result routes that require a session
- THEN the frontend redirects to login without rendering customer order data

#### Scenario: API authorization failure stays safe
- GIVEN the frontend requests an order detail and receives HTTP 403 or 404
- WHEN the page handles the response
- THEN it shows a stable not-found or access-denied state without exposing sensitive data

### Requirement: Customer tracking navigation

The shell SHOULD provide a customer-facing navigation entry for order history and SHALL NOT expose operations/admin order-management navigation to customer-only users.

#### Scenario: Customer sees customer order navigation
- GIVEN an authenticated user has role `CLIENT`
- WHEN the shell renders navigation
- THEN it includes a customer order history entry
- AND hides operations/admin order management entries
