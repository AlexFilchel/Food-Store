# Design: Order FSM and Audit Trail

## Technical Approach

Introduce a small domain/application service inside `backend/app/modules/orders/` that owns order state changes. Existing `OrderService.create_order` keeps creating `PENDIENTE` orders, but initial history and all later changes go through the transition service. `PaymentService._apply_payment_status` stops mutating `order.state_id` directly and instead requests a system transition after MercadoPago status verification.

## Architecture Decisions

| Topic | Options / Tradeoff | Decision |
|---|---|---|
| FSM location | DB triggers are hard to test; router logic duplicates rules. | Add `orders/fsm.py` for pure transition policy plus `OrderTransitionService` in `orders/service.py` or `orders/transition_service.py`, using the existing UoW/repository pattern. |
| State catalog | New enum table is clean but disruptive; existing `order_states` already has seeded codes. | Keep `order_states` as source of truth and encode allowed transitions by state `code`. |
| Audit model | Existing `order_history` has state and user only; proposal needs actor/source/reason/idempotency. | Add nullable metadata columns: `actor_type`, `source`, `reason_code`, `event_key`; keep old columns for compatibility. Add unique nullable/partial index on `event_key`. |
| Stock restoration | Payment retry must not restock; repeated cancel must not restock twice. | Restore stock only on first accepted transition into `CANCELADO`, in the same transaction, guarded by current state + idempotency. |
| Payment sync | Auto-confirm inline is simple but hidden. | Payment status update remains in payments; order transition is delegated to FSM as actor `system`, source `payment`, event key `mp:{payment_id}:approved`. |

## Data Flow

```text
customer/admin/payment ──→ router/payment service ──→ OrderTransitionService
                                      │                      │
                                      │                      ├─ lock order
                                      │                      ├─ validate FSM + actor
                                      │                      ├─ apply stock side effects
                                      │                      └─ append order_history
                                      └──────── existing UoW transaction ────────┘
```

Allowed transitions:

| From | To | Actors | Notes |
|---|---|---|---|
| `NULL` | `PENDIENTE` | customer | Order creation audit. |
| `PENDIENTE` | `CONFIRMADO` | system, admin | System only from approved payment. |
| `PENDIENTE` | `CANCELADO` | customer, admin, system | Customer pre-confirm only; system for payment cancelled/expired if mapped. |
| `CONFIRMADO` | `EN_PREPARACION` | admin | Operations progression. |
| `CONFIRMADO` | `CANCELADO` | admin | Restore stock. |
| `EN_PREPARACION` | `EN_CAMINO` | admin | Operations progression. |
| `EN_PREPARACION` | `CANCELADO` | admin | Restore stock. |
| `EN_CAMINO` | `ENTREGADO` | admin | Delivery completion. |

`ENTREGADO` and `CANCELADO` are terminal; self-transitions are idempotent only when `event_key` already exists.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/app/modules/orders/fsm.py` | Create | Pure transition matrix, actor enum literals, guard result/errors. |
| `backend/app/modules/orders/service.py` | Modify | Add transition service; route creation history through it. |
| `backend/app/modules/orders/repository.py` | Modify | Add `get_by_id_for_update`, history lookup by `event_key`. |
| `backend/app/modules/orders/model.py` | Modify | Add audit metadata fields/indexes to `OrderHistory`. |
| `backend/app/modules/orders/router.py` | Modify | Add customer cancel endpoint and admin transition endpoints. |
| `backend/app/modules/orders/schemas.py` | Modify | Add transition request/response/history metadata fields. |
| `backend/app/modules/orders/errors.py` | Modify | Add invalid transition, forbidden transition, terminal order, duplicate event errors. |
| `backend/app/modules/payments/service.py` | Modify | Replace direct order confirmation with FSM call. |
| `backend/alembic/versions/20260512_0009_order_fsm_audit.py` | Create | Add history metadata columns and indexes. |
| `backend/app/db/seed.py` | Modify | Keep state seeds stable; update descriptions only if needed. |
| `backend/tests/test_order_payment_e2e.py` | Modify | Add transition/payment/idempotency/stock assertions. |

## Interfaces / Contracts

```python
async transition_order(uow, *, order_id: int, to_code: str,
    actor_type: Literal["customer", "admin", "system"],
    actor_user_id: int | None, source: str, reason_code: str | None,
    note: str | None, event_key: str | None) -> Order
```

API impact: `POST /api/v1/orders/{id}/cancel` for owner pre-confirm cancel; `POST /api/v1/admin/orders/{id}/transition` for admin operation changes. Responses reuse `OrderResponse`; history responses expose actor/source/reason.

## Transaction / Concurrency / Idempotency

The transition service runs inside `async with uow`. It loads the order with `SELECT ... FOR UPDATE`, checks terminal state, then checks `order_history.event_key`. If the key exists, return current order without appending or side effects. Otherwise update `orders.state_id`, restore product stock from `order_items` only when entering `CANCELADO`, append one `order_history`, flush, and let UoW commit. Product rows touched during restoration should be locked/updated in deterministic `product_id` order.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Matrix allows/denies transitions per actor and terminal states. | Pure tests for `orders/fsm.py`. |
| Integration | Audit exactly once, event idempotency, customer/admin permissions, stock restore. | Async DB/API tests using existing fixtures. |
| E2E | Approved payment confirms via FSM; duplicate webhook/status sync does not duplicate history. | Extend `test_order_payment_e2e.py`. |

## Migration / Rollout

Additive migration only. Existing history rows keep null metadata. Backfill not required; new code writes metadata for all future transitions.

## Resolved Product Decisions

- Rejected MercadoPago payments keep the order `PENDIENTE` and retryable; only cancelled/expired-style payment states may drive `PENDIENTE -> CANCELADO`.
