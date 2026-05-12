# Proposal: Order FSM and Audit Trail

## Intent

Make order lifecycle transitions explicit and auditable. Today orders start at `PENDIENTE`, payment approval can implicitly confirm them, and history exists without centralized transition rules. This change defines one FSM for payments, cancelation, operations, stock effects, and future tracking.

## Scope

### In Scope
- Define allowed order transitions, actors, guards, and terminal states.
- Centralize transition execution so every change writes append-only `order_history`.
- Add customer/admin/system cancelation with stock restoration rules.
- Replace implicit payment-confirm logic with FSM-driven payment sync.
- Test transition, audit, idempotency, permission, and stock scenarios.

### Out of Scope
- Customer tracking UI.
- Operations dashboard.
- Archived OpenSpec status/checklist cleanup.
- Payment provider replacement or refund workflow.

## Approach

Introduce an order transition service/policy used by order and payment flows. It validates `from -> to`, actor role, guards, terminal restrictions, and stock side effects in one transaction. Payment approval becomes a system transition to `CONFIRMADO`; failed/rejected/cancelled payments only affect orders through explicit FSM rules. History remains append-only and records actor/source/reason/timestamps.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/app/modules/orders/*` | Modified | FSM policy, transition service, cancel/admin routes/schemas. |
| `backend/app/modules/payments/service.py` | Modified | Use FSM for payment-driven order sync. |
| `backend/alembic/versions/*` | New/Modified | Add audit metadata if `order_history` is insufficient. |
| `backend/tests/test_order_payment_e2e.py` | New/Modified | Cover payment/order transition integration. |
| `openspec/specs/order-creation/spec.md` | Future archive | Lifecycle behavior affected. |
| `openspec/specs/mercadopago-payment/spec.md` | Future archive | Payment sync behavior affected. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| FSM blocks checkout/payment happy path | Medium | Preserve `PENDIENTE -> CONFIRMADO` on approved payment. |
| Stock restored twice on repeated cancel/webhook | Medium | Guard terminal transitions transactionally. |
| Audit gaps from direct `state_id` writes | Medium | Route state writes through FSM and test history. |

## Rollback Plan

Revert the change files and migration. Existing orders remain readable because current state/history tables are preserved or migrated additively.

## Dependencies

- `order-creation-core`
- `mercadopago-payment-flow`
- `auth-rbac-core`

## Success Criteria

- [ ] All order state changes use the FSM service.
- [ ] Every accepted transition creates exactly one audit record.
- [ ] Payment approval confirms through the FSM without duplicate history.
- [ ] Cancelation permissions, terminal guards, and stock restoration are tested.
