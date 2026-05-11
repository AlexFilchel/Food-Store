## Why

Customers can now build a cart and manage delivery addresses, but the cart checkout action is still intentionally inert. Before creating orders or payments, the system needs an authenticated checkout preflight that revalidates cart contents, delivery address ownership, current product sellability, customization rules and authoritative totals.

## What Changes

- Add an authenticated checkout preflight API that accepts the cart handoff payload and a selected delivery address.
- Revalidate every cart line against current backend product state: active, available, non-deleted, in stock and current price.
- Validate removed ingredient customizations against current product composition and removability flags.
- Validate delivery address ownership and active/non-deleted status using the current user from auth.
- Return a canonical checkout summary with authoritative line totals, subtotal and selected delivery address snapshot preview.
- Add frontend checkout preflight flow from the cart page requiring login before validation.
- Keep order creation, payment preference creation, stock reservation and stock decrement out of scope.

## Capabilities

### New Capabilities

- `checkout-preflight-validation`: Authenticated validation and summary of cart + delivery address before order creation.

### Modified Capabilities

- `shopping-cart`: Replace the inert checkout placeholder with a handoff into authenticated checkout preflight while preserving local cart behavior.

## Impact

- Backend: new checkout module/router/service/schemas under `backend/app/modules/checkout` or equivalent.
- Backend dependencies: current auth user, product repository/service, delivery address repository/service and canonical Problem Details errors.
- Frontend: cart page checkout CTA, checkout/preflight API client, query/mutation hooks and summary/error UI.
- Tests: backend service/router tests for validation cases; frontend cart/checkout tests for login gating, summary and safe errors.
- No database migration is expected for this change because no order, payment or reservation records are persisted.
