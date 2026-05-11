## Context

The project already has public catalog APIs/UI, authenticated customer profiles and delivery address management. A minimal persisted Zustand cart store exists at `frontend/src/shared/stores/cart-store.ts`, but it currently identifies items only by `productId`, stores a raw `customization` list and is not connected to a full cart UX.

The cart is a pre-checkout client-side intent. It should let anonymous or authenticated users collect products before a later checkout change validates addresses, stock, payment and order creation.

## Goals / Non-Goals

**Goals:**

- Provide a clear cart UX from public product browsing to reviewing selected items.
- Store cart items locally so reloads do not lose the customer's order intent.
- Support product variants based on removed removable ingredients.
- Keep item quantity operations predictable and safe.
- Keep the future checkout boundary explicit by producing a stable cart handoff shape.

**Non-Goals:**

- Creating orders, order items or payment records.
- Reserving stock or decrementing inventory.
- Server-side cart persistence or cross-device synchronization.
- Applying coupons, delivery fees, taxes or payment totals.
- Enforcing authenticated checkout; checkout/auth gating belongs to a later change.

## Decisions

### 1. Keep cart state client-side for this change

Use the existing persisted Zustand approach rather than adding backend cart tables.

**Rationale:** The cart is not yet an order. Persisting it locally avoids premature backend state, keeps anonymous browsing simple and matches the current frontend store already present in the codebase.

**Alternative considered:** Backend cart persistence keyed by user/session. Rejected for now because it introduces session merging, anonymous cart identity and cleanup policies before checkout/order requirements exist.

### 2. Identify cart lines by product plus customization signature

Each cart line should have a stable `cartItemId` derived from `productId` and sorted removed ingredient ids. Adding the same product with the same customization increments quantity; adding the same product with different removed ingredients creates a separate line.

**Rationale:** A product customized by removing onion is not equivalent to the same product with all ingredients. Product-only identity would collapse distinct customer choices.

**Alternative considered:** Store one product line and mutate customization globally. Rejected because it loses distinct variants and makes quantity semantics ambiguous.

### 3. Store a product snapshot, not a full product entity

Cart items store only display and checkout-handoff data: product id, slug/name, unit price string/number, quantity and removed ingredient metadata.

**Rationale:** Cart UI must survive reloads and render quickly, but it should not duplicate the complete catalog model. Checkout will revalidate current price, availability and stock later.

**Alternative considered:** Re-fetch every product detail on cart load. Useful for stale detection, but not required for this change and would add query orchestration complexity.

### 4. Use public catalog data as the source for add-to-cart

Add-to-cart controls are shown from sellable public products/detail. Removable ingredient options come from the public product detail ingredient composition.

**Rationale:** The public catalog already hides inactive, unavailable, out-of-stock or soft-deleted products. The cart should only add products the user can currently browse.

**Alternative considered:** New cart validation endpoint. Rejected until checkout because order creation is where stock/price must be authoritative.

### 5. Keep checkout handoff explicit but inert

The cart should expose a payload shape like product id, quantity and removed ingredient ids for future checkout, but the UI action should be a placeholder or navigation boundary until checkout exists.

**Rationale:** This prevents mixing cart responsibilities with order/payment responsibilities.

## Risks / Trade-offs

- **Stale local cart data** → Checkout must revalidate product price, availability and stock before creating an order.
- **Local-only persistence is device-specific** → Acceptable until account/server cart sync is explicitly requested.
- **Ingredient removability can change after cart addition** → Future checkout/order validation must reject invalid customizations.
- **String price arithmetic can be error-prone** → Normalize totals through a small utility that parses decimal strings to cents or Decimal-safe numeric representation in frontend tests.

## Migration Plan

1. Refactor/enhance the existing cart store in place or move it behind a feature/entity boundary while preserving the `food-store-cart` persistence key where feasible.
2. Add cart UI and public catalog entry points.
3. Add tests for store behavior and UI flows.
4. No database migration or backend rollout is required.

Rollback: remove cart UI entry points and keep/clear the local storage key. No backend state needs cleanup.

## Open Questions

- Should the cart route be `/cart` or live inside the home/catalog shell? Default proposal: `/cart` for a shareable, dedicated review page.
- Should checkout placeholder require login now? Default proposal: no; show a clear “checkout coming next” or disabled handoff until the checkout change.
