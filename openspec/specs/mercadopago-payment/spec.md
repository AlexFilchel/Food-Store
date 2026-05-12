# Spec: mercadopago-payment

## Overview

Integrates MercadoPago payment processing with the order system: payment creation, webhook handling, status tracking, and retry support.

## Entities

### Payment

- Belongs to an order
- Has a status (from payment_statuses catalog)
- Tracks MercadoPago preference and payment IDs
- Has idempotency key to prevent duplicate payments
- Tracks attempts count and failure reasons

### PaymentEvent

- Append-only log of all payment-related events
- Tracks webhook payloads and processing status

## Business rules

1. **One active payment per order**: If a PENDING payment exists, return existing preference.
2. **Webhooks are untrusted**: Always consult MercadoPago API before updating state.
3. **Idempotency**: Each payment has a unique key to prevent duplicates.
4. **Retry support**: Failed/rejected payments can be retried, creating new preferences.
5. **Auto-confirm on APPROVED**: When payment is approved, order state changes to CONFIRMADO.
6. **Fast webhook response**: Webhook endpoint always returns 200 OK immediately.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/payments/init | Yes | Init payment for order |
| GET | /api/v1/payments/{id}/status | Yes | Get payment status |
| GET | /api/v1/payments/by-order/{id} | Yes | Get payment by order |
| POST | /api/v1/payments/{id}/retry | Yes | Retry failed payment |
| POST | /api/v1/payments/webhook | No | MercadoPago webhook |

## Dependencies

- `order-creation-core` — orders must exist to be paid
- `auth-rbac-core` — user identity for ownership validation
- MercadoPago API — external payment gateway
