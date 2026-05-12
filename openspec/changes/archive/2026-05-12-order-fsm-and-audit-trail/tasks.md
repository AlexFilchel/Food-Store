# Tasks: Order FSM and Audit Trail

## Phase 1: Backend Domain Foundation

- [x] 1.1 Create `backend/app/modules/orders/fsm.py` with transition matrix, actor/source literals, terminal-state checks, and stable FSM error codes.
- [x] 1.2 Modify `backend/app/modules/orders/errors.py` with invalid transition, forbidden transition, terminal order, and duplicate event exceptions.
- [x] 1.3 Modify `backend/app/modules/orders/model.py` `OrderHistory` fields to support previous/new state, actor metadata, source, reason, note, and `event_key`.
- [x] 1.4 Modify `backend/app/modules/orders/repository.py` with `get_by_id_for_update` and `get_history_by_event_key` helpers used by the transition service.
- [x] 1.5 Add `OrderTransitionService` in `backend/app/modules/orders/service.py` or `backend/app/modules/orders/transition_service.py`; depends on 1.1-1.4.
- [x] 1.6 Route `OrderService.create_order` initial `NULL -> PENDIENTE` audit through the transition service without changing stock reservation behavior.

## Phase 2: Migration

- [x] 2.1 Create `backend/alembic/versions/20260512_0009_order_fsm_audit.py` adding nullable audit metadata columns to `order_history`.
- [x] 2.2 Add a unique nullable/partial index for `order_history.event_key`; keep rollback additive and safe for existing null metadata.
- [x] 2.3 Verify `backend/app/db/seed.py` preserves existing order state codes, especially `EN_CAMINO` rather than `ENVIADO`.

## Phase 3: API

- [x] 3.1 Modify `backend/app/modules/orders/schemas.py` with transition/cancel request schemas and history response metadata fields.
- [x] 3.2 Modify `backend/app/modules/orders/router.py` with `POST /api/v1/orders/{id}/cancel` for owner-only `PENDIENTE -> CANCELADO`.
- [x] 3.3 Modify `backend/app/modules/orders/router.py` with admin transition endpoint for `CONFIRMADO -> EN_PREPARACION`, `EN_PREPARACION -> EN_CAMINO`, `EN_CAMINO -> ENTREGADO`, and admin cancellations.

## Phase 4: Payments Integration

- [x] 4.1 Modify `backend/app/modules/payments/service.py` so approved MercadoPago status calls FSM `PENDIENTE -> CONFIRMADO` with source `payment` and event key `mp:{payment_id}:approved`.
- [x] 4.2 Keep rejected MercadoPago payments leaving orders `PENDIENTE` and retryable while recording payment rejection reason.
- [x] 4.3 Map only cancelled/expired-style payment statuses to FSM `PENDIENTE -> CANCELADO`; do not bypass guards for terminal/non-pending orders.

## Phase 5: Tests

- [x] 5.1 Add unit tests for `backend/app/modules/orders/fsm.py`: allowed matrix, terminal rejection, actor permissions, and system payment-only transitions.
- [x] 5.2 Extend order API/DB tests for customer own pending cancel, unauthorized customer 403, admin operations, invalid transition no-history, and stock restore once.
- [x] 5.3 Extend `backend/tests/test_order_payment_e2e.py` for approved confirmation audit, duplicate approval idempotency, rejected retryable pending order, cancelled/expired cancel, and late rejected ignored after confirmation.

## Phase 6: Verification

- [x] 6.1 Run backend test suite covering orders/payments and confirm every accepted transition appends exactly one `order_history` row.
- [x] 6.2 Manually inspect direct `order.state_id` writes and replace or justify any remaining non-FSM writes before marking tasks complete.
