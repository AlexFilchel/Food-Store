# Design: Customer Order Tracking

## Technical Approach

Extend the existing FastAPI `orders`/`payments` modules and React Feature-Sliced order/payment areas. Keep customer ownership checks in backend repository/service calls, expose paginated customer DTOs, and drive screens with TanStack Query key factories. This maps to the order history/detail specs, MercadoPago return feedback, and authenticated customer shell requirements.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Customer endpoints stay under `/api/v1/orders` and `/api/v1/payments` | New tracking module or admin queue endpoints | Existing modules already own order/payment invariants; this avoids duplicating FSM/payment rules and keeps operations-order-management out of scope. |
| Introduce customer-specific response DTOs | Reuse current `OrderResponse` everywhere | List now needs `items/total/skip/limit`; detail needs payment summary and visible history without changing order creation unnecessarily. |
| Secure payment result lookup by authenticated owner | Keep public `external_reference` lookup | Current public result endpoint can expose payment data by guessable `order-{id}` reference; spec requires authenticated route and ownership-scoped payment visibility. |
| Add targeted query methods and indexes | Filter/paginate in memory | Ownership, state filtering, totals, and newest-first ordering must be database-scoped to avoid leakage and wrong totals. |

## Data Flow

```text
OrdersPage ──useCustomerOrdersQuery(filters)──> GET /orders?state_code&skip&limit
   │                                                └─ repo filters by user_id + state, counts total
OrderDetailPage ──useCustomerOrderQuery(id)──> GET /orders/{id}
   │                                                ├─ ownership-scoped order/items/history
   │                                                └─ latest payment summary
PaymentResultPage ──external_reference──> GET /payments/result/{ref}
                                                    └─ sync pending payment, verify owner, show feedback/retry
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/app/modules/orders/schemas.py` | Modify | Add `OrderListPageResponse`, filter params shape if needed, `PaymentSummaryResponse`, and detail DTO including visible history. |
| `backend/app/modules/orders/repository.py` | Modify | Add `list_by_user_paginated(...)`, `count_by_user(...)`, state-code join/filter support. |
| `backend/app/modules/orders/service.py` | Modify | Return paginated list, build detail with history and latest payment summary while preserving create response. |
| `backend/app/modules/orders/router.py` | Modify | Add `state_code`, `skip`, `limit` query params; return paginated response. |
| `backend/app/modules/payments/router.py` | Modify | Require `get_current_user` for result lookup. |
| `backend/app/modules/payments/service.py` | Modify | Scope external-reference result to owner and expose retry eligibility in status response. |
| `backend/alembic/versions/20260512_0010_customer_order_tracking_indexes.py` | Create | Add composite indexes for customer list/filter queries. |
| `frontend/src/entities/order/model/types.ts` | Modify | Add paginated list, detail, payment summary, history, filters. |
| `frontend/src/entities/order/api/order-client.ts` | Modify | Send list query params and consume detail DTO. |
| `frontend/src/features/orders/model/hooks.ts` | Modify | Add `orderQueryKeys` factory with serializable filter keys. |
| `frontend/src/pages/orders-page/ui/orders-page.tsx` | Modify | Add state filter, pagination controls, safe empty/loading/error states. |
| `frontend/src/pages/order-detail-page/ui/order-detail-page.tsx` | Modify | Render payment summary, retry eligibility, and visible timeline. |
| `frontend/src/pages/payment-result-page/ui/payment-result-page.tsx` | Modify | Derive feedback from authenticated backend status; link to detail, not just list. |
| `frontend/src/app/router.tsx`, `frontend/src/app/routes/route-config.ts` | Modify | Move payment result into authenticated shell and restrict customer tracking navigation/routes to `CLIENT`. |

## Interfaces / Contracts

```http
GET /api/v1/orders?state_code=CONFIRMADO&skip=0&limit=20
-> { items: OrderListResponse[], total: number, skip: number, limit: number }

GET /api/v1/orders/{order_id}
-> OrderDetailResponse { ...order, payment: PaymentSummary | null, history: OrderHistoryResponse[] }

GET /api/v1/payments/result/{external_reference}
-> PaymentStatusResponse { ..., retry_allowed: boolean }
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit/repository | Ownership, state filter, pagination totals, latest payment summary | Extend order/payment tests with seeded users/orders/payments. |
| Backend E2E | Cross-customer list/detail/payment-result denial; approved/rejected/pending feedback | Extend `backend/tests/test_order_payment_e2e.py`. |
| Frontend unit | Query keys, filter params, result states, route guards | Add Vitest/RTL tests near pages/hooks if project pattern is present. |

## Migration / Rollout

Additive indexes only; no data backfill. Roll out backend contract first, then frontend consumers. Rollback removes indexes and reverts route/UI changes.

## Open Questions

- [ ] Should `ADMIN` users with no `CLIENT` role access customer `/orders`, or should admin order visibility wait for `operations-order-management`?
