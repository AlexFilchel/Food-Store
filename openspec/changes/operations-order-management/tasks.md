# Tasks: Operations Order Management

## Phase 1: Backend Contracts and Persistence

- [ ] 1.1 Add operations filter/list/detail/action DTOs to `backend/app/modules/orders/schemas.py` for list pagination, detail context, payment summary, history, and `allowed_actions`.
- [ ] 1.2 Add repository methods in `backend/app/modules/orders/repository.py` for global paginated order queries/counts with state/date/customer/payment filters ordered newest first.
- [ ] 1.3 Add operations detail loaders in `backend/app/modules/orders/repository.py` for customer, delivery, items, payment, current state, and transition history without mutating audit rows.
- [ ] 1.4 Verify query plans and create `backend/alembic/versions/*operations_order_indexes.py` only for missing composite indexes needed by operations filters.

## Phase 2: Backend Operations Behavior

- [ ] 2.1 Update `backend/app/modules/orders/router.py` admin routes to require `require_role("ADMIN", "PEDIDOS")` for operations list/detail/transition endpoints.
- [ ] 2.2 Implement operations list/detail builders in `backend/app/modules/orders/service.py`, including server-computed `allowed_actions` from existing FSM rules.
- [ ] 2.3 Wire `POST /api/v1/admin/orders/{order_id}/transition` in `backend/app/modules/orders/service.py` to existing FSM with `actor_type="admin"`, source `operations`, and one audit append.
- [ ] 2.4 Reuse or extend `backend/app/modules/orders/errors.py` so 401/403/not-found/FSM failures use stable canonical errors and invalid transitions have no side effects.

## Phase 3: Frontend Operations Shell

- [ ] 3.1 Add operations route metadata and navigation in `frontend/src/app/routes/route-config.ts` for `/admin/orders` and `/admin/orders/:orderId`, visible only to `ADMIN`/`PEDIDOS`.
- [ ] 3.2 Register operations routes in `frontend/src/app/router.tsx` behind the existing protected shell and role guard, with anonymous redirect and customer access-denied behavior.
- [ ] 3.3 Add operations API calls in `frontend/src/entities/order/api/order-client.ts` and DTO/filter/action types in `frontend/src/entities/order/model/types.ts`.
- [ ] 3.4 Add operations query keys, list/detail queries, transition mutation, and stale-data invalidation in `frontend/src/features/orders/model/hooks.ts`.

## Phase 4: Frontend Pages

- [ ] 4.1 Create `frontend/src/pages/admin-orders-page/ui/admin-orders-page.tsx` with filters, pagination, newest-first results, and loading/empty/error/forbidden states.
- [ ] 4.2 Create `frontend/src/pages/admin-order-detail-page/ui/admin-order-detail-page.tsx` showing customer, delivery, items, payment summary, state, audit timeline, and server-provided actions.
- [ ] 4.3 Ensure action submission refreshes detail/list state and shows stable errors when backend rejects stale FSM or authorization requests.

## Phase 5: Verification

- [ ] 5.1 Extend `backend/tests/test_order_payment_e2e.py` for `ADMIN`/`PEDIDOS` access, `CLIENT` 403, unauthenticated 401, filters, missing order, and read-only detail/history.
- [ ] 5.2 Add backend transition coverage for allowed `CONFIRMADO` → `EN_PREPARACION` and disallowed terminal transitions preserving order state, stock, and audit count.
- [ ] 5.3 Extend `frontend/src/app/router.test.tsx` for operations route guards, navigation visibility, customer denial, anonymous redirect, and protected shell rendering.
- [ ] 5.4 Add frontend page/hook tests for filters, loading/empty/error states, allowed action rendering, successful mutation refresh, and stale-action error invalidation.
