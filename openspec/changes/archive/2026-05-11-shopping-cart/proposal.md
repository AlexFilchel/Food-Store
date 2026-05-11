## Why

Customers can browse products and manage delivery addresses, but they still cannot build an order intent before checkout. A shopping cart is the next user-facing capability needed to bridge the public catalog with the future checkout/order flow.

## What Changes

- Add a customer shopping cart experience that allows users to add sellable catalog products from product detail and manage selected items before checkout.
- Support quantity changes, item removal, cart clearing and running item/subtotal totals.
- Preserve cart contents across page reloads using the existing frontend store/persistence pattern.
- Track product customization by removed removable ingredients so two variants of the same product can coexist when their customization differs.
- Add cart entry points from the public catalog/detail UI and a dedicated cart route/section.
- Surface clear empty, success and validation states without requiring login.
- Prepare a checkout handoff shape, but do not create orders, reserve stock or process payment in this change.

## Capabilities

### New Capabilities

- `shopping-cart`: Customer-facing cart state and UI for adding, customizing, reviewing and managing catalog products before checkout.

### Modified Capabilities

- `public-catalog-experience`: Add-to-cart affordances are added to catalog/detail UX while preserving anonymous catalog access.

## Impact

- Frontend cart store under `frontend/src/shared/stores/cart-store.ts` or a dedicated cart feature/entity structure.
- Public catalog/detail components and routes for cart entry points.
- New cart UI route or section, with tests for add/update/remove/persistence behavior.
- No database migration, backend cart table, order creation or payment integration in this change.
