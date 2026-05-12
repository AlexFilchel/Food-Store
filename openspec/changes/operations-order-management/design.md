# Design: Operations Order Management

## Technical Approach

Extend the existing `orders` module with operations-only read models and commands. Backend remains source of truth for RBAC/FSM: `ADMIN` and `PEDIDOS` may read the global operations queue, while allowed state actions are computed server-side from `orders/fsm.py`. Frontend adds a separate protected operations route, avoiding reuse of customer `/orders` screens.

## Architecture Decisions

| Topic | Options / Tradeoff | Decision |
|---|---|---|
| Route boundary | Reusing `/orders` risks customer/operations leakage; new module duplicates order logic. | Add operations endpoints under `/api/v1/admin/orders` in the existing orders router/service. |
| Role mapping | Extending FSM actor types would touch archived FSM behavior. | Authorize `ADMIN`/`PEDIDOS` at route level, then call existing FSM with `actor_type="admin"` and `changed_by_user_id`. |
| Read model | Returning full detail in the list is heavy; list-only DTO lacks context. | Create compact operations list DTO plus detail DTO with customer, delivery, items, payment, history, and `allowed_actions`. |
| Filtering | In-memory filtering is simple but wrong for totals/security. | Repository performs paginated DB filters by state/date/customer/payment signal, ordered newest first. |
| Frontend data | Shared customer hooks would pollute query keys and permissions. | Add operations-specific client/hooks/query keys, with targeted invalidation after transition. |

## Data Flow

```text
OpsOrdersPage ──GET /admin/orders?filters──> OrderRepository global query
      │                                      └─ joins state/user/latest payment signal
OpsOrderDetailPage ──GET /admin/orders/{id}──> service builds full context + actions
      │
      └─ POST /admin/orders/{id}/transition ──> transition_order(... actor_type="admin")
                                                 └─ lock order, FSM guard, audit append
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/app/modules/orders/router.py` | Modify | Change admin router dependency to `require_role("ADMIN", "PEDIDOS")`; add admin list/detail endpoints and keep transition endpoint. |
| `backend/app/modules/orders/service.py` | Modify | Add operations list/detail builders, allowed-action calculation, and transition response refresh. |
| `backend/app/modules/orders/repository.py` | Modify | Add global paginated query/count and operations detail loaders using DB filters. |
| `backend/app/modules/orders/schemas.py` | Modify | Add operations filter/list/detail/action DTOs. |
| `backend/app/modules/orders/errors.py` | Modify | Reuse canonical not-found/forbidden/FSM errors; add stable invalid operation action if needed. |
| `backend/alembic/versions/*operations_order_indexes.py` | Create | Add only missing composite indexes for global queue filters after verifying query plan. |
| `frontend/src/app/routes/route-config.ts` | Modify | Add `/admin/orders`, `/admin/orders/:orderId`, nav entry for `ADMIN`/`PEDIDOS`, and default `PEDIDOS` path. |
| `frontend/src/app/router.tsx` | Modify | Register operations routes behind `RoleGuard` for `ADMIN`/`PEDIDOS`. |
| `frontend/src/entities/order/api/order-client.ts` | Modify | Add operations list/detail/transition calls. |
| `frontend/src/entities/order/model/types.ts` | Modify | Add operations DTO/filter/action types. |
| `frontend/src/features/orders/model/hooks.ts` | Modify | Add operations query keys, queries, mutation, and invalidation. |
| `frontend/src/pages/admin-orders-page/ui/admin-orders-page.tsx` | Create | Global queue UI with filters, pagination, empty/loading/error states. |
| `frontend/src/pages/admin-order-detail-page/ui/admin-order-detail-page.tsx` | Create | Operational detail, audit timeline, payment summary, and action buttons. |
| `backend/tests/test_order_payment_e2e.py`, `frontend/src/app/router.test.tsx` | Modify | Cover RBAC, filters, detail, transitions, and route access. |

## Interfaces / Contracts

```http
GET /api/v1/admin/orders?state_code=&date_from=&date_to=&customer=&payment_status_code=&skip=0&limit=20
-> { items, total, skip, limit }
GET /api/v1/admin/orders/{order_id}
-> { order, customer, delivery_address, items, payment, history, allowed_actions }
POST /api/v1/admin/orders/{order_id}/transition
{ "to_state_code": "EN_PREPARACION", "reason_code": null, "note": null }
-> operations detail or updated order response
```

`allowed_actions` contains state codes the current role may request; frontend hides absent actions but backend still validates RBAC/FSM.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit | Allowed actions from current state; filter normalization. | Service/repository tests with seeded orders. |
| Backend integration | `ADMIN`/`PEDIDOS` allowed; `CLIENT` forbidden; transition appends one audit row and invalid transitions do not mutate. | Extend async API/E2E tests. |
| Frontend unit | Navigation, route guards, filters, action mutation invalidation, error/empty/loading states. | Vitest/RTL mocks following existing page tests. |

## Migration / Rollout

Additive routes, DTOs, UI, and optional indexes only. No data backfill. Roll back by removing operations routes/pages/client additions; existing customer tracking and FSM remain unchanged.

## Open Questions

- [ ] Active delta specs for this change were not present under `openspec/changes/operations-order-management/specs/`; design used proposal plus archived/main specs.
