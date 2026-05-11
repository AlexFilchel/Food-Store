# Proposal: order-creation-core

## Problem

The system has no way to persist orders. After the user validates their cart through checkout-preflight, there is no mechanism to create an actual order with immutable snapshots of products, prices, and delivery address. Without this, the business cannot track purchases, manage stock decrements atomically, or provide order history to customers.

## Solution

Implement `order-creation-core` which introduces:

1. **Order model** — an aggregate root that captures the full state of a purchase at creation time, including immutable snapshots of the delivery address and product details (name, slug, price).
2. **Order items** — line items with product snapshots and customization details (removed ingredients).
3. **Order history** — append-only audit trail tracking state transitions from the moment of creation.
4. **Atomic stock decrement** — stock is decremented as part of the order creation transaction, ensuring consistency.
5. **Order number generation** — unique, human-readable order numbers (e.g., `ORD-20260511120000-A1B2C3`).
6. **REST API** — `POST /orders` to create, `GET /orders` to list, `GET /orders/{id}` to get detail.
7. **Frontend flow** — the cart page now creates an order after preflight validation, clears the cart, and navigates to the orders page.

## Non-goals

- Payment integration (handled by `mercadopago-payment-flow`)
- Order state transitions beyond initial creation (handled by `order-fsm-and-audit-trail`)
- Order cancellation (handled by `order-fsm-and-audit-trail`)
- Admin order management (handled by `operations-order-management`)

## User stories

- US-035: Create order from cart
- US-036: Order number generation
- US-037: Product/price snapshot in order
- US-038: Delivery address snapshot in order
