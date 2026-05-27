## 1. Backend RBAC and Seed Data

- [x] 1.1 Add `COCINA` to backend role constants/types and any role validation lists used by auth, identity administration, and tests.
- [x] 1.2 Update `backend/app/db/seed.py` so `Rol(code='COCINA', name='Cocinero')` is inserted idempotently.
- [x] 1.3 Add or update seed tests proving the `COCINA` role exists and repeated seeding does not duplicate it.
- [x] 1.4 Update admin user role assignment UI/API tests so admins can assign and remove `COCINA` like other non-admin roles.

## 2. Backend Kitchen Queue Read Model

- [x] 2.1 Create a kitchen module/router under `backend/app/modules/` for `/api/v1/cocina` endpoints.
- [x] 2.2 Add schemas for kitchen order cards including order id/number, state code/display name, item snapshots, quantities, personalization, notes, and kitchen-entry timestamp.
- [x] 2.3 Add repository/query logic for orders in `CONFIRMADO` and `EN_PREPARACION`, ordered by the `HistorialEstadoPedido.created_at` entry into `CONFIRMADO`.
- [x] 2.4 Implement `GET /api/v1/cocina/pedidos` guarded by `require_role` for `COCINA`, `PEDIDOS`, and `ADMIN`.
- [x] 2.5 Add backend tests for queue filtering, ordering, response shape, and 403 for unauthorized roles.

## 3. Backend FSM Authorization and Audit

- [x] 3.1 Extend the order FSM authorization matrix so `COCINA` can execute only `CONFIRMADO -> EN_PREPARACION` and `EN_PREPARACION -> EN_CAMINO`.
- [x] 3.2 Ensure `COCINA` receives HTTP 403 for cancellation, delivery, payment-confirmation, and any other non-kitchen transition attempts.
- [x] 3.3 Ensure accepted cocina transitions append `HistorialEstadoPedido` entries with the cocina user's id and do not update/delete history.
- [x] 3.4 Add or update FSM tests for allowed cocina transitions, forbidden cocina transitions, and audit rows.

## 4. Backend Real-Time Kitchen Events

- [x] 4.1 Implement an in-process kitchen connection manager for active FastAPI WebSocket connections.
- [x] 4.2 Implement `WS /api/v1/cocina/ws` with JWT handshake validation and role authorization for `COCINA`, `PEDIDOS`, and `ADMIN`.
- [x] 4.3 Define kitchen event payloads for `PEDIDO_CONFIRMADO`, `PEDIDO_EN_PREPARACION`, `PEDIDO_EN_CAMINO`, and `PEDIDO_CANCELADO`.
- [x] 4.4 Publish kitchen events only after committed FSM transitions that affect the kitchen queue.
- [x] 4.5 Ensure publishing with no connected clients is best-effort and never fails the state transition.
- [x] 4.6 Add WebSocket tests with FastAPI `TestClient` for accepted handshakes, rejected handshakes, event delivery, and no-client publish behavior.

## 5. Frontend Routing and Access Control

- [x] 5.1 Add `COCINA` to frontend role types, role labels, and role-aware user administration components.
- [x] 5.2 Add a `/cocina` route protected for `COCINA`, `PEDIDOS`, and `ADMIN` in the app router.
- [x] 5.3 Add role-aware navigation so `COCINA`, `PEDIDOS`, and `ADMIN` see the kitchen display entry and customer-only users do not.
- [x] 5.4 Route users whose only operational role is `COCINA` to `/cocina` after login/session restoration when no explicit destination is requested.
- [x] 5.5 Exclude `/cocina` from inactivity auto-logout while preserving normal token expiration handling.
- [x] 5.6 Add frontend route/navigation tests for authorized and unauthorized kitchen access.

## 6. Frontend KDS Data and Live State

- [x] 6.1 Add API client methods/types for `GET /api/v1/cocina/pedidos` and kitchen order card payloads.
- [x] 6.2 Implement a kitchen WebSocket client or hook that authenticates with the current token and normalizes incoming kitchen events.
- [x] 6.3 Implement KDS state handling for initial load, adding confirmed orders, moving orders to `EN_PREPARACION`, and removing orders on `EN_CAMINO` or `CANCELADO`.
- [x] 6.4 Implement disconnected-live indicator, polling fallback every 30 seconds, and full queue refresh on reconnect.
- [x] 6.5 Add frontend tests for event application, disconnect fallback, reconnect refresh, and stale-card removal.

## 7. Frontend KDS UI

- [x] 7.1 Create the `/cocina` page using a two-column layout: `CONFIRMADO` as "Por preparar" and `EN_PREPARACION` as "En preparación".
- [x] 7.2 Render each card with order number, item snapshot names, quantities, personalization/exclusions, customer notes, state, and elapsed time.
- [x] 7.3 Add actions for "Iniciar preparación" and "Listo" wired to the existing order-state transition endpoint.
- [x] 7.4 Add client-side urgency styling with thresholds under 10 minutes, 10-20 minutes, and over 20 minutes, recalculated every 15 seconds.
- [x] 7.5 Add optional visual flash and Web Audio beep on `PEDIDO_CONFIRMADO`, with sound toggle persisted in local storage.
- [x] 7.6 Add component tests for rendering, action calls, urgency thresholds, timer refresh behavior, and alert toggle persistence.

## 8. Verification

- [x] 8.1 Run focused backend tests for seed/RBAC, kitchen queue, FSM authorization, audit, and WebSocket event behavior.
- [x] 8.2 Run focused frontend tests for routing, navigation, KDS data handling, fallback behavior, and UI interactions.
- [x] 8.3 Run OpenSpec status/validation for `add-kitchen-display` and confirm all apply-required artifacts are complete.
- [x] 8.4 Manually review that v1 introduces no new order states, no new kitchen tables, no Redis dependency, and no product availability toggle.
