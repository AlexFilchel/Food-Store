## Verification Report: order-fsm-and-audit-trail

**Date**: 2026-05-12
**Change**: order-fsm-and-audit-trail
**Version**: N/A
**Tasks**: 20/20 complete

---

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 20 |
| Tasks complete | 20 |
| Tasks incomplete | 0 |

All tasks in `openspec/changes/order-fsm-and-audit-trail/tasks.md` are marked complete.

---

### Build & Tests Execution

**Build**: ➖ Not run

Direct instruction for this verification was to run tests only and no builds. Project/user rules also say never build after changes.

**Tests**: ✅ 30 passed / ❌ 0 failed / ⚠️ 0 skipped

```powershell
pytest backend/tests/test_orders_fsm.py backend/tests/test_order_payment_e2e.py backend/tests/test_migrations.py
```

Result:

```text
collected 30 items
backend\tests\test_orders_fsm.py .....                                   [ 16%]
backend\tests\test_order_payment_e2e.py .....................            [ 86%]
backend\tests\test_migrations.py ....                                    [100%]
30 passed in 35.20s
Exit code: 0
```

**Coverage**: ➖ Not configured in `openspec/config.yaml`.

---

### Spec Compliance Matrix

| Requirement | Scenario | Runtime Evidence | Result |
|-------------|----------|------------------|--------|
| Explicit order lifecycle FSM | Valid transition is accepted | `backend/tests/test_order_payment_e2e.py::test_admin_transition_flow_and_invalid_transition_has_no_history` verifies admin progression through `CONFIRMADO`, `EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`, incrementing history exactly once per accepted transition. | ✅ COMPLIANT |
| Explicit order lifecycle FSM | Invalid transition is rejected | `test_orders_fsm.py::test_fsm_rejects_invalid_transition` and `test_order_payment_e2e.py::test_admin_transition_flow_and_invalid_transition_has_no_history` verify `PENDIENTE -> ENTREGADO` returns stable `ORDER_INVALID_TRANSITION`/409 and leaves state/history unchanged. | ✅ COMPLIANT |
| Role-based transition permissions | Customer cancels own pending order | `test_order_payment_e2e.py::test_customer_can_cancel_own_pending_order_and_restore_stock` verifies owner cancellation, `CANCELADO`, stock restoration, and customer audit metadata. | ✅ COMPLIANT |
| Role-based transition permissions | Unauthorized customer action is rejected | `test_order_payment_e2e.py::test_customer_cannot_cancel_other_customer_order` verifies HTTP 403 and no additional audit row. | ✅ COMPLIANT |
| Immutable transition audit | Audit captures system transition | `test_order_payment_e2e.py::test_payment_result_redirect_can_reconcile_without_webhook` verifies payment transition history has `actor_type=system`, `source=payment`, `reason_code=payment_approved`, and MP payment reference/event key. | ✅ COMPLIANT |
| Stock side effects on lifecycle changes | Cancellation restores stock once | `test_order_payment_e2e.py::test_customer_can_cancel_own_pending_order_and_restore_stock` repeats cancellation and verifies stock returns only to original quantity and history count stays at creation + one cancel. | ✅ COMPLIANT |
| OrderHistory | Invalid transition has no history | `test_order_payment_e2e.py::test_admin_transition_flow_and_invalid_transition_has_no_history` verifies invalid pre-terminal and terminal transitions leave persisted history count unchanged. | ✅ COMPLIANT |
| Payment-driven FSM synchronization | Approved payment confirms order | `test_order_payment_e2e.py::test_payment_result_redirect_can_reconcile_without_webhook` verifies approved MP reconciliation transitions the order to `Confirmado` and appends payment-sourced audit. | ✅ COMPLIANT |
| Payment-driven FSM synchronization | Rejected payment keeps pending order retryable | `test_order_payment_e2e.py::test_retry_allowed_after_rejected_payment_and_blocked_after_cancellation` verifies rejected payment leaves order `Pendiente`, stock remains reserved, and retry creates a new preference. | ✅ COMPLIANT |
| Idempotent external payment events | Duplicate approval event is ignored for order transition | `test_order_payment_e2e.py::test_duplicate_approval_event_is_idempotent_for_order_transition` verifies duplicate webhook does not append order history again and does not change stock again. | ✅ COMPLIANT |
| Idempotent external payment events | Late rejected event cannot cancel confirmed order | `test_order_payment_e2e.py::test_late_rejected_event_after_confirmation_does_not_change_order_or_history` verifies late rejected webhook leaves order `Confirmado` and history count unchanged while payment failure reason is recorded. | ✅ COMPLIANT |
| Auto-confirm on APPROVED | Approval for cancelled order is not applied | `test_order_payment_e2e.py::test_approval_for_cancelled_order_is_ignored_but_payment_event_is_processed` verifies approved webhook for a cancelled order leaves the order `Cancelado`, keeps order history unchanged, and records/processes the payment event. | ✅ COMPLIANT |
| Retry support | Retry allowed after rejected payment | `test_order_payment_e2e.py::test_retry_allowed_after_rejected_payment_and_blocked_after_cancellation` verifies retry after rejected payment returns 200 and increments attempts. | ✅ COMPLIANT |
| Retry support | Retry blocked after order cancellation | `test_order_payment_e2e.py::test_retry_allowed_after_rejected_payment_and_blocked_after_cancellation` verifies retry after cancelled payment/order returns 409 with `PAYMENT_ORDER_NOT_PENDING`. | ✅ COMPLIANT |

**Compliance summary**: 14/14 scenarios compliant.

---

### Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Explicit order lifecycle FSM | ✅ Implemented | `backend/app/modules/orders/fsm.py` defines the required matrix, terminal states, actor/source guards, and stable FSM error codes. |
| Role-based transition permissions | ✅ Implemented | `can_transition` enforces actor capabilities; `_transition_order_in_uow` enforces customer ownership before transition. |
| Immutable transition audit | ✅ Implemented | `OrderHistory` has previous/new state fields, actor metadata, source, reason, note, event key, and timestamp; transition service appends after accepted transitions. |
| Stock side effects on lifecycle changes | ✅ Implemented | Creation decrements stock; accepted transitions into `CANCELADO` restore stock; idempotent event-key return prevents duplicate side effects. |
| OrderHistory modification | ✅ Implemented | Model/repository/migration support history metadata and `event_key`; invalid transitions reject before append. |
| Payment-driven FSM synchronization | ✅ Implemented | `PaymentService._apply_payment_status` delegates approved and cancelled/expired statuses to the order FSM and leaves rejected orders pending. |
| Idempotent external payment events | ✅ Implemented | `_transition_order_in_uow` checks existing `order_history.event_key` and returns without duplicate audit/side effects. |
| Auto-confirm on APPROVED | ✅ Implemented | Payments no longer directly mutate order state; direct `state_id` writes in `backend/app` are limited to order creation and the centralized transition path. |
| Retry support | ✅ Implemented | `retry_payment` requires the related order to remain `PENDIENTE`; rejected payments remain retryable, cancelled orders are blocked. |

---

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Pure FSM policy plus transition service path | ✅ Yes | `orders/fsm.py` holds transition policy; centralized transition methods live in `OrderService`. The design allowed implementation in `orders/service.py` or a separate transition service. |
| Keep `order_states` as source of truth | ✅ Yes | State codes are resolved from `order_states`; seed preserves `EN_CAMINO` and does not introduce `ENVIADO`. |
| Add nullable audit metadata and event-key uniqueness | ✅ Yes | Migration `20260512_0009_order_fsm_audit.py` adds nullable metadata columns and a PostgreSQL partial unique index for non-null `event_key`; model exposes the fields. |
| Restore stock only on first accepted cancellation | ✅ Yes | Transition path restores only when entering `CANCELADO`; duplicate event keys return early; repeated cancel test proves no duplicate stock restore. |
| Payment sync delegates to FSM | ✅ Yes | Approved and cancelled/expired payment states call `_transition_order_in_uow` with `actor_type=system`, `source=payment`, and stable event keys. |
| Transaction/concurrency/idempotency | ✅ Yes | Transitions run in UoW, lock orders with `get_by_id_for_update`, lock product rows through `list_by_ids_for_update` in deterministic product-id order, and check event keys. |
| Add customer cancel and admin transition endpoints | ✅ Yes | `POST /api/v1/orders/{id}/cancel` and `POST /api/v1/admin/orders/{id}/transition` are implemented. |

---

### Previous Critical Gap Re-check

| Previous gap | Current runtime proof | Status |
|--------------|-----------------------|--------|
| Duplicate approval idempotency untested | `test_duplicate_approval_event_is_idempotent_for_order_transition` passed. | ✅ Closed |
| Late rejected after confirmation untested | `test_late_rejected_event_after_confirmation_does_not_change_order_or_history` passed. | ✅ Closed |
| Approval for cancelled order untested | `test_approval_for_cancelled_order_is_ignored_but_payment_event_is_processed` passed. | ✅ Closed |
| Retry after rejected / blocked after cancellation untested | `test_retry_allowed_after_rejected_payment_and_blocked_after_cancellation` passed. | ✅ Closed |
| Audit metadata/no-history/stock-once assertions partial | Updated integration assertions in `test_order_payment_e2e.py` passed. | ✅ Closed |

---

### Issues Found

**CRITICAL** (must fix before archive):
None.

**WARNING** (should fix):
None.

**SUGGESTION** (nice to have):
- Consider adding explicit migration assertions for the new `order_history` audit metadata columns/index names inside `backend/tests/test_migrations.py`; the current migration test proves head upgrade/downgrade, but does not individually assert those newly added schema details.

---

### Verdict

PASS

All OpenSpec scenarios for `order-fsm-and-audit-trail` have passing runtime evidence, previous critical verification gaps are closed, and the targeted verification suite passes.
