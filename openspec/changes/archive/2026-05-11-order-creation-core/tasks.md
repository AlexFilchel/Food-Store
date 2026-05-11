# Tasks: order-creation-core

## Backend

- [x] Create Order, OrderItem, OrderHistory models in `backend/app/modules/orders/model.py`
- [x] Create OrderRepository, OrderItemRepository, OrderHistoryRepository in `backend/app/modules/orders/repository.py`
- [x] Create OrderCreateRequest, OrderResponse, OrderListResponse schemas in `backend/app/modules/orders/schemas.py`
- [x] Create order error factories in `backend/app/modules/orders/errors.py`
- [x] Create OrderService with create_order, get_order, list_orders in `backend/app/modules/orders/service.py`
- [x] Create order router with POST/GET endpoints in `backend/app/modules/orders/router.py`
- [x] Register order repositories in SqlAlchemyUnitOfWork
- [x] Register order router in API router
- [x] Create Alembic migration for orders, order_items, order_history tables

## Frontend

- [x] Create order entity types in `frontend/src/entities/order/model/types.ts`
- [x] Create order API client in `frontend/src/entities/order/api/order-client.ts`
- [x] Create useCreateOrderMutation, useOrderListQuery, useOrderQuery hooks in `frontend/src/features/orders/model/hooks.ts`
- [x] Update CartPage to create order after preflight validation
- [x] Update OrdersPage to display order list
- [x] Create OrderDetailPage for viewing individual orders
- [x] Add order detail route to router config
- [x] Add CLIENT role to orders navigation

## Verification

- [ ] Run Alembic migration
- [ ] Test order creation flow end-to-end
- [ ] Verify stock decrement
- [ ] Verify address snapshot immutability
- [ ] Verify product snapshot immutability
