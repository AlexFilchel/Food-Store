# Design: mercadopago-payment-flow

## Architecture decisions

### 1. Port/Adapter pattern for MercadoPago

The `MercadoPagoPort` abstract interface defines three operations:
- `create_preference` — creates a MercadoPago checkout preference
- `get_payment_status` — consults real payment status from MercadoPago
- `search_payment_by_external_reference` — searches payments by external reference

Two adapters:
- `MercadoPagoAdapter` — real httpx calls to MercadoPago API
- `MockMercadoPagoAdapter` — returns mock data for testing

### 2. Webhooks as untrusted signals

Per the guardrails: "webhooks are treated as untrusted signals":
1. Respond fast with 200 OK
2. Log the raw event in `payment_events` table
3. Consult real status from MercadoPago API
4. Update payment and order state ONLY after confirmation from MercadoPago

### 3. Idempotency

Every payment has a unique `idempotency_key` (UUID). If a payment already exists for an order with PENDING status, return the existing preference instead of creating a new one.

### 4. Payment → Order state mapping

When a payment is APPROVED:
- Order state changes from PENDIENTE to CONFIRMADO
- Order history entry is created

### 5. Retry support

Failed/rejected payments can be retried:
- Increments `attempts` counter
- Creates new MercadoPago preference
- Resets status to PENDING

## Database schema

### `payment_statuses` table (seed)

| ID | Code | Terminal |
|----|------|----------|
| 1 | PENDING | No |
| 2 | APPROVED | Yes |
| 3 | AUTHORIZED | No |
| 4 | IN_PROCESS | No |
| 5 | IN_MEDIATION | No |
| 6 | REJECTED | Yes |
| 7 | CANCELLED | Yes |
| 8 | REFUNDED | Yes |
| 9 | CHARGED_BACK | Yes |
| 10 | FAILED | Yes |

### `payments` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| order_id | INTEGER FK | |
| payment_method_id | INTEGER FK | |
| status_id | INTEGER FK → payment_statuses | |
| mp_preference_id | VARCHAR(255) | MercadoPago preference ID |
| mp_payment_id | VARCHAR(255) | MercadoPago payment ID (from webhook) |
| mp_merchant_order_id | VARCHAR(255) | |
| mp_external_reference | VARCHAR(255) | order-{id} |
| amount | NUMERIC(12,2) | |
| currency | VARCHAR(3) | ARS |
| idempotency_key | VARCHAR(255) UNIQUE | |
| failure_reason | TEXT | |
| attempts | INTEGER | |

### `payment_events` table

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| payment_id | INTEGER FK | |
| event_type | VARCHAR(100) | |
| raw_payload | TEXT | |
| processed | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

## API contract

### POST /api/v1/payments/init

**Request:** `{ "order_id": 1 }`
**Response (201):** `{ "payment_id": 1, "preference_id": "...", "init_point": "...", "sandbox_init_point": "...", "external_reference": "order-1" }`

### POST /api/v1/payments/webhook

**Request:** MercadoPago webhook payload
**Response:** 200 OK (always)

### GET /api/v1/payments/{id}/status

Returns payment status for authenticated user.

### GET /api/v1/payments/by-order/{order_id}

Returns payment for an order.

### POST /api/v1/payments/{id}/retry

Retries a failed payment, returns new preference.

## Frontend flow

1. User confirms order in cart page
2. Cart creates order via `POST /api/v1/orders`
3. Cart inits payment via `POST /api/v1/payments/init`
4. User is redirected to MercadoPago `init_point`
5. After payment, MercadoPago redirects to `/payment/result?external_reference=order-{id}`
6. Payment result page shows status
7. Order detail page shows payment status and retry button for failed payments

## Config requirements

- `MP_ACCESS_TOKEN` — MercadoPago access token
- `MP_PUBLIC_KEY` — MercadoPago public key (frontend)
- `MP_NOTIFICATION_URL` — Webhook URL
