# Proposal: Customer Order Tracking

## Intent

Give authenticated customers a reliable self-service view of their orders, order details, post-creation confirmation, and MercadoPago return feedback without exposing other customers' data.

## Scope

### In Scope
- Customer order list with ownership filtering, newest-first ordering, state filter, and pagination contract.
- Customer order detail with item snapshots, delivery snapshot, current FSM state, total, and payment status/retry feedback.
- Frontend confirmation and payment-result flows for US-071 and US-072.

### Out of Scope
- Operations/admin order management (`operations-order-management`).
- User administration and dashboard metrics.
- New payment provider behavior beyond displaying/retrying existing MercadoPago attempts.

## Approach

Extend the existing customer `/api/v1/orders` surfaces and React order pages rather than creating admin-style endpoints. Keep ownership enforcement in backend services/repositories, expose pagination/filter metadata, and let frontend screens consume TanStack Query hooks for list/detail/payment-result states.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/app/modules/orders/` | Modified | List/detail schemas, service/repository queries, ownership, state filter, pagination. |
| `backend/app/modules/payments/` | Modified | Read-only payment status data used by order detail/payment result. |
| `frontend/src/entities/order/` | Modified | Client/types for paginated list, detail, and filters. |
| `frontend/src/features/orders/` | Modified | Query hooks and cache keys for list/detail tracking. |
| `frontend/src/pages/orders-page/` | Modified | Customer order history UI with filters/pagination. |
| `frontend/src/pages/order-detail-page/` | Modified | Detail, payment status, and retry affordance. |
| `frontend/src/pages/payment-result*` | New/Modified | MercadoPago return feedback page. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cross-customer order exposure | Med | Enforce `user_id` in every customer query and cover 403/404 cases. |
| Payment return shows stale state | Med | Query backend on page load; show pending/in-process fallback. |
| API pagination mismatch | Low | Follow project skip/limit + total convention. |

## Rollback Plan

Revert the customer tracking endpoints/schema changes and remove the new/updated frontend routes/pages; existing order creation, FSM, and payment flows remain intact.

## Dependencies

- `order-creation-core`, `mercadopago-payment-flow`, `order-fsm-and-audit-trail`, `frontend-shell-access-control`.

## Success Criteria

- [ ] Customers can list only their orders with state filter and pagination.
- [ ] Customers can view only their own order detail with item/address snapshots and payment state.
- [ ] Order creation and MercadoPago return show clear success/rejected/pending feedback with retry when allowed.
