# Proposal: mercadopago-payment-flow

## Problem

Orders are created but there is no mechanism to collect payment. The system needs to integrate with MercadoPago to process real payments, track payment status, handle webhooks, and support payment retries.

## Solution

Implement `mercadopago-payment-flow` which introduces:

1. **Payment model** — tracks payment attempts with MercadoPago preference/payment IDs, status, amount, and idempotency key.
2. **Payment statuses** — seed data for all MercadoPago states (PENDING, APPROVED, REJECTED, etc.)
3. **MercadoPago gateway** — abstract port + real adapter for MercadoPago API + mock adapter for testing.
4. **Payment service** — init payment, retry payment, process webhook, sync status.
5. **Webhook handler** — treats webhooks as untrusted signals: log, consult real status, then update.
6. **Payment router** — REST endpoints for init, status, retry, and webhook.
7. **Frontend integration** — cart creates order → init payment → redirect to MercadoPago → payment result page.
8. **Payment result page** — shows success/failure/pending after MercadoPago redirect.
9. **Retry support** — failed/rejected payments can be retried from order detail page.

## Non-goals

- Order state transitions beyond CONFIRMADO (handled by `order-fsm-and-audit-trail`)
- Refund handling (future change)
- Payment reconciliation dashboard (future change)

## User stories

- US-045: MercadoPago payment creation
- US-047: Payment status tracking
- US-048: Payment retry on failure
