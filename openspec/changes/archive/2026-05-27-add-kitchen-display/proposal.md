## Why

Food Store currently has order creation, payment confirmation, and an order FSM, but it does not have a dedicated kitchen production workflow: confirmed paid orders are managed through the general order manager and there is no real-time kitchen display. This change adds a Kitchen Display System (KDS) and a `COCINA` operational role so kitchen staff can see, prioritize, and advance preparation without broad CRUD or delivery permissions.

## What Changes

- Add a dedicated `/cocina` frontend route showing paid orders in the kitchen phase in real time.
- Add a `COCINA` role with narrowly scoped permissions: view KDS, start preparation, and mark preparation as finished.
- Extend order FSM authorization so `COCINA` can execute only `CONFIRMADO -> EN_PREPARACION` and `EN_PREPARACION -> EN_CAMINO`.
- Add a kitchen REST endpoint for initial/fallback loading of orders in `CONFIRMADO` and `EN_PREPARACION`, ordered oldest-first by kitchen entry time.
- Add a push channel for kitchen events using WebSocket in the v1 single-instance deployment model.
- Publish KDS events after committed order transitions so connected kitchen screens add, move, or remove cards without manual refresh.
- Add frontend resilience: connection status, polling fallback every 30 seconds while disconnected, and full refresh on reconnect.
- Add urgency indicators based on time since the order entered `CONFIRMADO`.
- Add optional local UI alerting for new confirmed orders: visual flash and sound toggle persisted in local storage.
- Do not add new order states, tables, or Redis in v1.
- Do not include the optional product availability action (`US-COCINA-07`) in v1; it can be proposed separately because it overlaps with stock/product permissions.

## Capabilities

### New Capabilities
- `kitchen-display`: Dedicated kitchen workflow covering the `/cocina` screen, kitchen order queue, real-time events, fallback polling, urgency display, and kitchen-only user actions.

### Modified Capabilities
- `auth-rbac-core`: Add the `COCINA` role and enforce its scoped permissions across REST, WebSocket handshake, route guards, and FSM transition authorization.
- `order-creation`: Refine order lifecycle behavior by publishing kitchen events after relevant committed transitions and allowing the kitchen role to execute only preparation-phase transitions.
- `frontend-shell-access-control`: Add role-aware navigation/route access for `/cocina` and exclude that route from inactivity auto-logout.

## Impact

- Backend FastAPI API: new `GET /api/v1/cocina/pedidos` and `WS /api/v1/cocina/ws` endpoints.
- Backend order FSM/service layer: transition authorization for `COCINA`, event publication after commit, and append-only audit consistency.
- Backend auth/RBAC seed: add idempotent `Rol(codigo='COCINA', nombre='Cocinero')` and optional dev user assignment.
- Frontend React/Vite: new `/cocina` page, route guard, role navigation, WebSocket client, fallback polling, and timer UI.
- Database: no new tables or order states for v1; only role seed data changes are required.
- Deployment/runtime: v1 push delivery uses an in-process connection manager and is therefore single-instance only; multi-instance deployments will require an external pub/sub bus such as Redis.
