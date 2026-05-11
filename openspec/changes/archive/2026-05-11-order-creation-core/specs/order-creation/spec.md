# Spec: order-creation

## Overview

Creates orders atomically from the shopping cart, with immutable snapshots of products, prices, delivery address, and initial order history.

## Entities

### Order

- Belongs to a user
- Has a state (initial: PENDIENTE)
- Has optional payment method
- Has unique order number
- Contains immutable delivery address snapshot
- Contains immutable product snapshots in order items
- Tracks subtotal

### OrderItem

- Belongs to an order
- Contains product snapshot (id, name, slug, unit_price)
- Contains quantity and calculated line_total
- Contains customization snapshot (removed_ingredients as comma-separated string)

### OrderHistory

- Belongs to an order
- Records state transitions (from_state → to_state)
- Records who made the change
- Append-only audit trail

## Business rules

1. **Atomic creation**: Order, items, stock decrement, and history are created in a single transaction.
2. **Stock validation**: Each product must have sufficient stock for the requested quantity.
3. **Product validation**: Products must exist, be active, be available, and not be soft-deleted.
4. **Customization validation**: Removed ingredient IDs must reference valid, removable ingredients for the product.
5. **Address resolution**: Uses provided address_id, or falls back to user's default address.
6. **Snapshot immutability**: Order items capture product name, slug, and price at creation time. Changes to products after order creation do not affect existing orders.
7. **Order number uniqueness**: Generated with timestamp + random suffix to prevent collisions.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/orders | Yes | Create order |
| GET | /api/v1/orders | Yes | List user's orders |
| GET | /api/v1/orders/{id} | Yes | Get order detail |

## Dependencies

- `auth-rbac-core` — user identity and JWT authentication
- `delivery-addresses` — delivery address CRUD
- `checkout-preflight-validation` — preflight validation pattern
- `product-catalog-management` — product model and stock
