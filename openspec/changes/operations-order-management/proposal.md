# Proposal: Operations Order Management

## Intent

Give `ADMIN` and `PEDIDOS` users an operational order workspace to see all orders, inspect full context, and execute allowed daily FSM transitions without reusing customer-only tracking screens.

## Scope

### In Scope
- Global operations order list with filters for state/date/customer/payment signal and project pagination.
- Operations order detail with customer, delivery snapshot, items, payment summary, FSM history, and allowed actions.
- Backend endpoints/services that enforce role + state permissions for operational transitions.
- Protected frontend routes/navigation for admin/gestor order management.

### Out of Scope
- Customer order history/detail/payment feedback already covered by `customer-order-tracking`.
- Dashboard metrics, user administration, refunds, or payment-provider changes.
- New FSM states outside the existing lifecycle.

## Approach

Extend the existing orders module with operations-specific read models and transition commands. Backend remains source of truth for RBAC and FSM guards; frontend only renders available actions from server state and handles loading/error/empty states inside the protected shell.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/app/modules/orders/router.py` | Modified | Add operations list/detail/action routes. |
| `backend/app/modules/orders/service.py` | Modified | Query global orders and call FSM transition service. |
| `backend/app/modules/orders/repository.py` | Modified | Filtered paginated operational queries. |
| `backend/app/modules/orders/schemas.py` | Modified | Operations list/detail/action DTOs. |
| `frontend/src/app/router.tsx` | Modified | Protected operations order routes. |
| `frontend/src/entities/order/api/order-client.ts` | Modified | Operations API client/types. |
| `frontend/src/pages/*operations*` | New | Admin/gestor order list and detail UI. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unauthorized operational access | Med | Enforce backend RBAC; frontend hiding is UX only. |
| Invalid/double transitions | Med | Reuse FSM service and append-only audit rules. |
| Heavy global list queries | Med | Require pagination and indexed filters. |

## Rollback Plan

Remove operations routes/pages/client code and backend operations endpoints/schemas. Existing customer tracking, order creation, payments, FSM, and audit tables remain unchanged.

## Dependencies

- `order-fsm-and-audit-trail`
- `frontend-shell-access-control`
- `auth-rbac-core`

## Success Criteria

- [ ] `ADMIN`/`PEDIDOS` can list and filter global orders; customers cannot access it.
- [ ] Operators can view complete operational detail without mutating audit history.
- [ ] Allowed actions follow role + state rules and append exactly one FSM audit entry.
