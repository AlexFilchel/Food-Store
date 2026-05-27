## Context

Food Store already has authenticated users, RBAC, order creation, payment-driven confirmation, an explicit order FSM, and append-only order history. The missing piece is an operational kitchen workflow: paid orders become `CONFIRMADO`, but kitchen staff currently have no dedicated real-time screen and no narrowly scoped role for preparation-only actions.

The feature pack in `docs/feature-display-cocina/` closes several decisions for this change: add a `COCINA` role, reuse the existing FSM without adding `LISTO`, keep the v1 data model table-free, and provide high-fidelity real-time updates. The implementation must respect the current DB state code `EN_PREPARACION` while displaying the user-facing name "En preparación".

## Goals / Non-Goals

**Goals:**

- Add an operational KDS at `/cocina` for users with `COCINA`, `PEDIDOS`, or `ADMIN`.
- Show only kitchen-phase orders: `CONFIRMADO` and `EN_PREPARACION`, ordered by oldest kitchen-entry time.
- Let `COCINA` execute only `CONFIRMADO -> EN_PREPARACION` and `EN_PREPARACION -> EN_CAMINO` through the existing FSM service.
- Preserve append-only transition audit with the cook's user id.
- Push committed order changes to connected kitchen screens through a FastAPI WebSocket endpoint.
- Provide REST initial load and polling fallback to avoid losing operational visibility when the live connection drops.
- Keep v1 deployable in the current single-instance architecture without Redis or new database tables.

**Non-Goals:**

- No new FSM state such as `LISTO` in v1.
- No new kitchen-specific tables, stations, rounds, tables, branches, or waiter workflows.
- No multi-instance event bus in v1.
- No kitchen CRUD over products, categories, ingredients, users, or stock.
- No product availability toggle in v1; that optional story overlaps with `STOCK` and should be proposed separately if needed.

## Decisions

### 1. Use WebSocket plus REST fallback for the KDS

Use `WS /api/v1/cocina/ws?token=<JWT>` for live events and `GET /api/v1/cocina/pedidos` for initial state and degraded polling.

**Rationale:** the feature pack explicitly asks for push-based high-fidelity updates. WebSocket is already accepted by FastAPI and gives room for future bidirectional kitchen interactions if needed.

**Alternative considered:** SSE is simpler for server-to-client-only events. It is a good future simplification if the team wants less connection complexity, but this proposal keeps WebSocket to match the domain pack and avoid changing an already-closed decision without exploration.

### 2. Use an in-process connection manager for v1

Maintain active kitchen WebSocket connections in process and broadcast serialized kitchen events after relevant FSM transitions commit.

**Rationale:** Food Store currently runs as a REST + PostgreSQL application and the feature pack explicitly avoids Redis for a single-instance v1. In-process pub/sub keeps the architecture small and teachable.

**Alternative considered:** Redis Pub/Sub or an outbox/worker pipeline. Those solve multi-instance delivery and durability, but are heavier than the current deployment needs. The design documents the single-instance limit instead of pretending the in-process manager scales horizontally.

### 3. Publish events only after successful transaction commit

The FSM/order service publishes `PEDIDO_CONFIRMADO`, `PEDIDO_EN_PREPARACION`, `PEDIDO_EN_CAMINO`, and `PEDIDO_CANCELADO` only after the database transition and history append are committed.

**Rationale:** the KDS must not show phantom state changes that later roll back. Event delivery is best-effort, but event correctness should reflect committed database state.

**Alternative considered:** publish inside the transaction before commit for lower latency. Rejected because UI correctness matters more than a few milliseconds of latency.

### 4. Keep transition authorization in the FSM service

Endpoint-level RBAC may allow `COCINA`, `PEDIDOS`, and `ADMIN` to call the order-state endpoint, but the service must still evaluate exact role-to-transition permissions.

**Rationale:** `COCINA` is allowed to reach the endpoint but is not allowed to cancel, confirm payment, or mark delivered. If authorization only lives in `require_role`, a cook could perform transitions outside their operational boundary.

### 5. Reuse existing order data for the kitchen read model

The kitchen queue is derived from current tables:

- `Pedido` filtered by `estado_codigo IN ('CONFIRMADO', 'EN_PREPARACION')`.
- `DetallePedido` snapshots for item names, quantities, subtotals, and personalization.
- `Pedido.notas` for customer notes.
- `HistorialEstadoPedido.created_at` where `estado_hasta = 'CONFIRMADO'` as kitchen-entry time.

**Rationale:** v1 has no need for a separate kitchen ticket table. Reuse avoids schema churn and keeps the FSM/order history as the source of truth.

### 6. Treat WebSocket events as hints and REST as the repair path

The frontend applies WebSocket events incrementally while connected. On disconnect, it shows a live-connection warning and polls `GET /api/v1/cocina/pedidos` every 30 seconds. On reconnect, it performs a full refresh before resuming incremental updates.

**Rationale:** v1 events are not durable. Full refresh on reconnect prevents missed events from leaving stale cards on screen.

## Risks / Trade-offs

- **Single-instance broadcast limit** → Document as a known v1 deployment constraint; use Redis Pub/Sub or another bus before horizontal backend scaling.
- **Best-effort events can be missed during disconnects** → Use REST polling fallback and full refresh on reconnect.
- **`EN_PREPARACION -> EN_CAMINO` conflates "food ready" and "out for delivery"** → Accept for v1 to avoid a schema/FSM migration; revisit with a `LISTO` state only if the business needs that distinction.
- **WebSocket token in query string can appear in logs** → Keep TLS required in real deploys, avoid logging query strings, and consider first-message auth or short-lived WS tokens in a future hardening pass.
- **Browser autoplay restrictions can block sound alerts** → Require/tolerate prior user interaction and provide a persisted sound toggle; visual alert remains available.
- **Kitchen route is always-on and excluded from inactivity logout** → Limit access strictly by role and rely on normal token expiration/refresh handling rather than idle timeout on this route.

## Migration Plan

1. Add idempotent seed data for `Rol(codigo='COCINA', nombre='Cocinero')`.
2. Optionally add a development user/role assignment for local testing.
3. Extend backend role constants and route authorization to recognize `COCINA`.
4. Extend FSM transition authorization matrix for the two kitchen transitions only.
5. Add kitchen REST and WebSocket endpoints.
6. Add in-process kitchen event broadcaster and wire it after committed FSM transitions.
7. Add frontend `/cocina` route, guard, navigation entry, KDS page, live connection client, and polling fallback.
8. Verify with backend unit/integration tests, WebSocket tests through FastAPI `TestClient`, and frontend component/hook tests.

Rollback is low-risk because v1 adds no new order states or tables. If needed, hide `/cocina`, remove/disable the kitchen endpoints, and leave the inert `COCINA` seed role in place or remove it with a data migration if no users depend on it.

## Open Questions

- Should a future v2 introduce `LISTO` to separate "prepared" from "out for delivery"?
- Should product availability toggling by kitchen become a separate change, or remain owned by `STOCK` only?
- If deployment moves to multiple backend instances, which event bus should be adopted: Redis Pub/Sub, PostgreSQL notifications, or an outbox/worker model?
