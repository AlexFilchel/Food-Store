# Design: order-creation-core

## Architecture decisions

### 1. Order as aggregate root

The `Order` entity is the aggregate root. It owns `OrderItem` and `OrderHistory` entities. All access goes through the Order.

### 2. Immutable snapshots

When an order is created, we snapshot:
- **Delivery address** — all fields are copied into the `orders` table. If the user later edits or deletes the address, the order retains the original data.
- **Product details** — `product_name`, `product_slug`, `unit_price` are copied into `order_items`. If the product is later modified or deleted, the order line remains intact.
- **Customizations** — removed ingredients are stored as a comma-separated string in `order_items.removed_ingredients`.

### 3. Atomic stock decrement

Stock is decremented within the same transaction as order creation. If any step fails, the entire transaction rolls back — no orphaned stock changes.

### 4. Order number format

`ORD-{YYYYMMDDHHmmss}-{6-char-hex}` — timestamp-based for sortability, random suffix for uniqueness.

### 5. Initial state

Every new order starts in `PENDIENTE` state. A history entry is created recording this transition.

### 6. Payment method is optional at creation

The `payment_method_code` field is optional. It can be set later during the payment flow (`mercadopago-payment-flow`).

## Database schema

### `orders` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK → users.id | RESTRICT on delete |
| state_id | INTEGER FK → order_states.id | RESTRICT on delete |
| payment_method_id | INTEGER FK → payment_methods.id | Nullable, RESTRICT on delete |
| order_number | VARCHAR(30) UNIQUE | Indexed |
| delivery_* | Various | Snapshot of delivery address |
| subtotal | NUMERIC(12,2) | Total of all line items |
| notes | TEXT | Optional customer notes |
| created_at | TIMESTAMPTZ | From AuditMixin |
| updated_at | TIMESTAMPTZ | From AuditMixin |

### `order_items` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| order_id | INTEGER FK → orders.id | CASCADE on delete |
| product_id | INTEGER | Not FK (snapshot) |
| product_name | VARCHAR(160) | Snapshot |
| product_slug | VARCHAR(180) | Snapshot |
| unit_price | NUMERIC(12,2) | Snapshot |
| quantity | INTEGER | |
| line_total | NUMERIC(12,2) | unit_price × quantity |
| removed_ingredients | TEXT | Comma-separated names |

### `order_history` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| order_id | INTEGER FK → orders.id | CASCADE on delete |
| from_state_id | INTEGER FK → order_states.id | Nullable (null for initial) |
| to_state_id | INTEGER FK → order_states.id | |
| changed_by_user_id | INTEGER FK → users.id | SET NULL on delete |
| note | TEXT | Optional |
| created_at | TIMESTAMPTZ | |

## API contract

### POST /api/v1/orders

**Request:**
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "removed_ingredient_ids": [3, 5]
    }
  ],
  "delivery_address_id": 4,
  "payment_method_code": "EFECTIVO",
  "notes": "Sin picante por favor"
}
```

**Response (201):**
```json
{
  "id": 1,
  "order_number": "ORD-20260511120000-A1B2C3",
  "state": "Pendiente",
  "payment_method": "Efectivo",
  "delivery_address": {
    "recipient_name": "Juan Pérez",
    "phone": "11-1234-5678",
    "street": "Av. Corrientes",
    "street_number": "1234",
    "floor": "3",
    "apartment": "B",
    "city": "CABA",
    "province": "Buenos Aires",
    "postal_code": "1043",
    "reference": "Portón negro"
  },
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Hamburguesa Clásica",
      "product_slug": "hamburguesa-clasica",
      "unit_price": "3500.00",
      "quantity": 2,
      "line_total": "7000.00",
      "removed_ingredients": ["Tomate", "Lechuga"]
    }
  ],
  "subtotal": "7000.00",
  "notes": "Sin picante por favor",
  "created_at": "2026-05-11T15:00:00Z",
  "updated_at": "2026-05-11T15:00:00Z"
}
```

### GET /api/v1/orders

Returns list of orders for the authenticated user.

### GET /api/v1/orders/{order_id}

Returns full order detail for the authenticated user.

## Error codes

| Code | Status | When |
|------|--------|------|
| ORDER_EMPTY_CART | 400 | No items provided |
| ORDER_INVALID_QUANTITY | 422 | Quantity < 1 |
| ORDER_PRODUCT_NOT_FOUND | 404 | Product missing/inactive/unavailable |
| ORDER_INSUFFICIENT_STOCK | 409 | Not enough stock |
| ORDER_INVALID_CUSTOMIZATION | 400 | Invalid removed ingredient |
| ORDER_DELIVERY_ADDRESS_REQUIRED | 400 | No address and no default |
| ORDER_DELIVERY_ADDRESS_NOT_FOUND | 404 | Address doesn't exist or not owned |
| ORDER_PAYMENT_METHOD_NOT_FOUND | 404 | Invalid payment method code |
| ORDER_NOT_FOUND | 404 | Order doesn't exist or not owned |
