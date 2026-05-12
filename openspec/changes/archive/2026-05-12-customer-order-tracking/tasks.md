# Tasks: Customer Order Tracking

## Phase 1: Backend Contracts and Persistence

- [x] 1.1 Modify `backend/app/modules/orders/schemas.py` with `OrderListPageResponse`, customer detail DTO, visible history, and `PaymentSummaryResponse`.
- [x] 1.2 Create `backend/alembic/versions/20260512_0010_customer_order_tracking_indexes.py` with additive indexes for `user_id`, state, and newest-first order queries.
- [x] 1.3 Modify `backend/app/modules/payments/schemas.py` so payment status/result responses expose user-safe status, failure reason, and `retry_allowed` only.

## Phase 2: Backend Order and Payment Behavior

- [x] 2.1 Modify `backend/app/modules/orders/repository.py` with ownership-scoped paginated list/count queries, optional `state_code` filter, and newest-first ordering.
- [x] 2.2 Modify `backend/app/modules/orders/service.py` to return paginated customer history and detail with snapshots, current FSM state, visible history, and latest payment summary.
- [x] 2.3 Modify `backend/app/modules/orders/router.py` to accept `state_code`, `skip`, and `limit`, returning the paginated customer list contract.
- [x] 2.4 Modify `backend/app/modules/payments/service.py` to resolve MercadoPago result by external reference, synchronize pending state when needed, enforce owner scope, and compute retry eligibility.
- [x] 2.5 Modify `backend/app/modules/payments/router.py` so `GET /api/v1/payments/result/{external_reference}` requires `get_current_user`.

## Phase 3: Frontend Data and Routing

- [x] 3.1 Modify `frontend/src/entities/order/model/types.ts` with paginated list, detail, filter, payment summary, and history types.
- [x] 3.2 Modify `frontend/src/entities/order/api/order-client.ts` to send list filters/pagination and consume detail/payment-result DTOs.
- [x] 3.3 Modify `frontend/src/features/orders/model/hooks.ts` with stable TanStack Query keys for list filters, detail, and payment result.
- [x] 3.4 Modify `frontend/src/app/router.tsx` and `frontend/src/app/routes/route-config.ts` to place tracking/payment-result routes inside authenticated `CLIENT` access.

## Phase 4: Frontend Pages

- [x] 4.1 Modify `frontend/src/pages/orders-page/ui/orders-page.tsx` with state filter, pagination controls, and safe loading/empty/error states.
- [x] 4.2 Modify `frontend/src/pages/order-detail-page/ui/order-detail-page.tsx` to render snapshots, current state, payment summary, retry affordance, and visible timeline.
- [x] 4.3 Modify `frontend/src/pages/payment-result-page/ui/payment-result-page.tsx` to show approved/rejected/pending/unknown feedback, retry only when allowed, and link to order detail.

## Phase 5: Verification

- [x] 5.1 Extend `backend/tests/test_order_payment_e2e.py` for own-order list/detail, state filter totals, cross-customer denial, and payment-result ownership.
- [x] 5.2 Extend `frontend/src/app/router.test.tsx` for anonymous redirects and `CLIENT`-only customer tracking/payment-result access.
- [x] 5.3 Add or extend page/hook tests near `frontend/src/pages/*` and `frontend/src/features/orders/model/hooks.ts` for query keys, filters, 403/404 safe states, and payment feedback scenarios.
