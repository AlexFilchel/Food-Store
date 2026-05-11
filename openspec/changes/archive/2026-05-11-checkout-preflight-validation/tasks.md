# Tasks: checkout-preflight-validation

## 1. Backend checkout API contracts

- [x] 1.1 Add checkout preflight request schemas for cart lines, removed ingredient ids and optional delivery address id.
- [x] 1.2 Add checkout preflight response schemas for validated lines, address snapshot preview, line totals and subtotal.
- [x] 1.3 Add canonical checkout errors for empty cart, invalid quantity, invalid product, insufficient stock, invalid customization and invalid/missing address.
- [x] 1.4 Ensure schemas ignore or reject client-supplied owner/user fields and do not trust client price snapshots.

## 2. Backend checkout validation service

- [x] 2.1 Add checkout service/module following existing repository/UoW patterns.
- [x] 2.2 Validate authenticated ownership and selected/default delivery address availability.
- [x] 2.3 Validate every product line against active, available, non-deleted and stock rules.
- [x] 2.4 Validate removed ingredient ids against product composition and removability metadata.
- [x] 2.5 Calculate line totals and subtotal using Decimal-safe backend price values.
- [x] 2.6 Keep preflight stateless: no order rows, payment rows, provider preferences or stock mutations.

## 3. Backend router integration

- [x] 3.1 Add authenticated checkout router under `/api/v1/checkout/preflight` or equivalent.
- [x] 3.2 Register checkout router in the API router with current-user dependency.
- [x] 3.3 Return canonical Problem Details responses for validation and business rule failures.

## 4. Backend verification

- [x] 4.1 Test anonymous preflight returns canonical 401.
- [x] 4.2 Test valid preflight returns authoritative summary using backend product price and selected/default address.
- [x] 4.3 Test empty cart and invalid quantity failures.
- [x] 4.4 Test missing, inactive, unavailable, deleted and insufficient-stock products are rejected.
- [x] 4.5 Test stale/manipulated client price is ignored.
- [x] 4.6 Test invalid customizations for non-removable and foreign ingredients are rejected.
- [x] 4.7 Test foreign/deleted/missing delivery addresses are hidden and default address fallback works.
- [x] 4.8 Test preflight does not create orders/payments and does not mutate stock.

## 5. Frontend checkout data layer

- [x] 5.1 Add checkout preflight TypeScript types matching backend contracts.
- [x] 5.2 Add checkout preflight API client and TanStack mutation hook.
- [x] 5.3 Map local cart store checkout payload to the backend request shape.
- [x] 5.4 Reuse delivery address list data to select an address or default address in checkout UI.

## 6. Frontend checkout UI

- [x] 6.1 Replace inert cart checkout placeholder with login-aware checkout preflight flow.
- [x] 6.2 For anonymous users, route to login or show login-required UI without clearing cart.
- [x] 6.3 For authenticated users, render address selection/default address state before preflight.
- [x] 6.4 Display checkout summary with validated lines, customization summaries, address preview and subtotal.
- [x] 6.5 Display safe actionable checkout validation errors while preserving cart contents.
- [x] 6.6 Prevent API calls from an empty cart and provide a path back to catalog.

## 7. Frontend verification

- [x] 7.1 Test anonymous checkout requires login and preserves cart.
- [x] 7.2 Test authenticated checkout calls preflight with mapped cart payload and selected/default address.
- [x] 7.3 Test successful preflight summary rendering.
- [x] 7.4 Test checkout validation errors preserve cart and hide sensitive metadata.
- [x] 7.5 Test empty cart does not call preflight.

## 8. OPSX closure readiness

- [x] 8.1 Confirm proposal, design, spec and tasks match implemented behavior.
- [x] 8.2 Run targeted backend and frontend tests for checkout preflight.
- [ ] 8.3 Run verify and resolve blockers before archive.
