# Tasks: mercadopago-payment-flow

## Backend

- [x] Create PaymentStatus, Payment, PaymentEvent models in `backend/app/modules/payments/model.py`
- [x] Create PaymentRepository, PaymentStatusRepository, PaymentEventRepository in `backend/app/modules/payments/repository.py`
- [x] Create MercadoPagoPort abstract interface in `backend/app/modules/payments/gateway.py`
- [x] Create MercadoPagoAdapter (real) and MockMercadoPagoAdapter in `backend/app/modules/payments/mercadopago_adapter.py`
- [x] Create payment schemas in `backend/app/modules/payments/schemas.py`
- [x] Create payment error factories in `backend/app/modules/payments/errors.py`
- [x] Create PaymentService with init, retry, webhook, sync in `backend/app/modules/payments/service.py`
- [x] Create payment router with endpoints in `backend/app/modules/payments/router.py`
- [x] Register payment repositories in SqlAlchemyUnitOfWork
- [x] Register payment router in API router
- [x] Update seed.py with PaymentStatus seed data
- [x] Create Alembic migration for payment_statuses, payments, payment_events tables

## Frontend

- [x] Create payment entity types in `frontend/src/entities/payment/model/types.ts`
- [x] Create payment API client in `frontend/src/entities/payment/api/payment-client.ts`
- [x] Create useInitPaymentMutation, useRetryPaymentMutation, usePaymentByOrderQuery hooks in `frontend/src/features/payments/model/hooks.ts`
- [x] Create PaymentResultPage for showing payment outcome
- [x] Update CartPage to init payment and redirect to MercadoPago
- [x] Update OrderDetailPage to show payment status and retry button
- [x] Add payment result route to router config
- [x] Add PaymentResultPage route to router

## Verification

- [ ] Run Alembic migration
- [ ] Test payment init flow
- [ ] Test webhook processing
- [ ] Test payment retry
- [ ] Test payment result page
