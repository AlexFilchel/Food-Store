# Tasks: shopping-cart

## 1. Cart domain/store model

- [x] 1.1 Define cart item types with product snapshot, quantity, removed ingredient ids and stable cart line id.
- [x] 1.2 Refactor the existing persisted cart store to merge by product/customization signature instead of product id only.
- [x] 1.3 Add store actions for add item, remove line, update quantity, clear cart, total item count and subtotal calculation.
- [x] 1.4 Add price calculation helper that avoids floating point drift by using cents or another deterministic decimal-safe representation.

## 2. Product customization add-to-cart flow

- [x] 2.1 Add quantity controls to the public product detail experience.
- [x] 2.2 Render removable ingredients as customization choices and prevent non-removable ingredients from being selected for removal.
- [x] 2.3 Add product detail add-to-cart action that writes a product snapshot and customization metadata to the cart store.
- [x] 2.4 Show success and recoverable error feedback for add-to-cart attempts.

## 3. Cart review UI and routing

- [x] 3.1 Add a dedicated cart route or cart section reachable from the public shell.
- [x] 3.2 Render empty cart state with a path back to catalog browsing.
- [x] 3.3 Render populated cart lines with name, price, quantity, customization summary, line subtotal and remove controls.
- [x] 3.4 Add quantity update controls that prevent zero/negative persisted quantities.
- [x] 3.5 Add clear-cart action with stable UI feedback.
- [x] 3.6 Add a checkout handoff/placeholder that does not create orders or payments.

## 4. Public catalog integration

- [x] 4.1 Add catalog/list call to action that routes users to the product detail add-to-cart flow.
- [x] 4.2 Add shell/header cart indicator using persisted total item count.
- [x] 4.3 Ensure anonymous users can browse, add to cart and review cart without login redirects.

## 5. Frontend verification

- [x] 5.1 Test store merge behavior for same product and same customization.
- [x] 5.2 Test store separation behavior for same product with different removed ingredients.
- [x] 5.3 Test quantity update, remove line, clear cart and subtotal calculations.
- [x] 5.4 Test product detail add-to-cart with removable/non-removable ingredient behavior.
- [x] 5.5 Test empty and populated cart review UI states.
- [x] 5.6 Test cart persistence across remount/reload simulation.
- [x] 5.7 Test anonymous access to catalog add-to-cart and cart review routes.
- [x] 5.8 Test user-safe errors for missing product detail or invalid cart input.

## 6. OPSX closure readiness

- [x] 6.1 Confirm proposal, design, spec and tasks match implemented behavior.
- [x] 6.2 Run targeted frontend tests for cart store, product detail and cart route.
- [x] 6.3 Run verify and resolve blockers before archive.
