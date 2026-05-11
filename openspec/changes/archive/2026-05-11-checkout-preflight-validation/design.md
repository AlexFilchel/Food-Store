## Context

`shopping-cart` intentionally stores a local customer intent and exposes a checkout handoff payload, but it does not create orders, reserve stock or validate current backend truth. `delivery-addresses` stores active customer-owned delivery addresses. `product-catalog-management` and `public-catalog-experience` define sellable product state using active/available/stock/soft-delete semantics.

This change is the boundary between local cart intent and future `order-creation-core`. It must be strict: the backend must distrust client price/name/customization snapshots and recompute everything from current persisted data.

## Goals / Non-Goals

**Goals:**

- Validate cart handoff payloads for authenticated customers.
- Validate selected delivery address belongs to the current user and is active/non-deleted.
- Recompute authoritative line totals and subtotal using backend Decimal precision.
- Return actionable canonical errors for unavailable products, invalid quantities, invalid customizations and invalid addresses.
- Provide frontend UX from cart to checkout preflight summary.

**Non-Goals:**

- Create orders, order items, payment preferences or payment records.
- Reserve or decrement stock.
- Persist checkout sessions.
- Calculate delivery fees, taxes, discounts or coupons.
- Integrate Mercado Pago or any payment provider.
- Merge anonymous carts into user accounts server-side.

## Decisions

### 1. Backend preflight is authoritative and stateless

Create an authenticated endpoint such as `POST /api/v1/checkout/preflight` that accepts cart lines and a delivery address id, validates them, recomputes totals and returns a summary without persisting state.

**Why:** Checkout validation must use current database truth, but this change should not introduce durable order/payment state yet.

**Alternative:** Persist checkout sessions. Rejected because it creates cleanup/idempotency complexity before order creation exists.

### 2. Derive ownership from token, never request body

The request supplies `delivery_address_id`; the backend uses `current_user.id` to load the address. Client-supplied user fields are ignored/rejected by schema.

**Why:** This matches delivery address ownership rules and prevents checkout for another user's address.

**Alternative:** Accept `user_id` in checkout payload. Rejected because it violates ownership boundaries.

### 3. Re-read products and composition from backend state

The backend validates products by id and loads current price, stock, active/available/deleted state and ingredient composition. Client name/price snapshots are not trusted.

**Why:** Cart data can be stale or manipulated. Product sellability and price must be authoritative before order creation.

**Alternative:** Trust cart snapshot until order creation. Rejected because UX would show a misleading checkout summary.

### 4. Validate customization as removed ingredient ids only

The request includes removed ingredient ids per line. The backend verifies each id belongs to that product and is currently removable. Non-removable or unrelated ingredient ids fail validation.

**Why:** This preserves the shopping cart customization model and prevents invalid future order snapshots.

**Alternative:** Accept arbitrary customization text. Rejected because it cannot be validated safely.

### 5. Use canonical error contract with actionable codes

Return Problem Details with stable codes for empty cart, invalid quantity, product not found/unavailable/out of stock, invalid customization and address not found.

**Why:** Frontend can map errors safely and preserve cart state for correction.

**Alternative:** Return a mixed success summary with warnings. Rejected for this change because preflight should produce either a valid checkout summary or a clear blocker.

### 6. Frontend checkout flow requires authentication at preflight

Anonymous users may keep using the cart, but pressing checkout should send them to login or show login-required UI. Authenticated users can select an existing delivery address and run preflight.

**Why:** Delivery addresses are authenticated resources and checkout needs ownership.

**Alternative:** Let anonymous users enter ad-hoc address in checkout. Rejected because delivery-addresses exists and order ownership depends on authenticated identity.

## Risks / Trade-offs

- **Cart data can become stale after successful preflight** → Future order creation must revalidate again in the same transaction or operation.
- **No reservation means stock can change after summary** → Clearly treat preflight as non-reserving; order creation owns final stock checks.
- **Frontend may need address selection UI inside cart/checkout** → Reuse existing delivery address client/hooks rather than duplicating address management.
- **Multiple invalid lines can fail one by one** → Prefer field/line-level errors where possible, but maintain canonical Problem Details.

## Migration Plan

1. Add backend checkout schemas/errors/service/router and include router under API v1.
2. Add frontend checkout/preflight client/hooks and wire cart checkout CTA.
3. Reuse existing cart payload and delivery address list to select an address.
4. Add targeted backend/frontend tests.
5. No Alembic migration is expected.

Rollback: remove the checkout route/client/UI wiring. Since no data is persisted, rollback has no data cleanup requirement.

## Open Questions

- Should preflight require exactly one selected delivery address or auto-select the user's default address when omitted? Default proposal: allow omission to use default if one exists, but require explicit selection if no default exists.
- Should preflight return all invalid lines at once? Default proposal: return line-level details when practical, but block the whole summary if any line is invalid.
