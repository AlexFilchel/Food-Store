## ADDED Requirements

### Requirement: Kitchen queue visibility
The system SHALL expose a kitchen queue containing only orders in `CONFIRMADO` and `EN_PREPARACION`, sorted by oldest kitchen-entry time first.

#### Scenario: Kitchen queue excludes non-kitchen orders
- **GIVEN** orders exist in `PENDIENTE`, `CONFIRMADO`, `EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`, and `CANCELADO`
- **WHEN** an authorized kitchen user requests the kitchen queue
- **THEN** the response contains only orders in `CONFIRMADO` and `EN_PREPARACION`

#### Scenario: Kitchen queue is oldest first
- **GIVEN** multiple kitchen orders entered `CONFIRMADO` at different times
- **WHEN** an authorized kitchen user requests the kitchen queue
- **THEN** orders are sorted ascending by the `HistorialEstadoPedido.created_at` timestamp for entry into `CONFIRMADO`

### Requirement: Kitchen queue order cards
The KDS SHALL provide enough order data to render each kitchen card with order identity, item snapshots, quantities, item personalization, customer notes, current state, and kitchen-entry timestamp.

#### Scenario: Kitchen card contains preparation details
- **GIVEN** an authorized kitchen user opens `/cocina`
- **WHEN** the KDS renders a kitchen order
- **THEN** the card shows the order number, item snapshot names, quantities, personalization or exclusions, customer notes when present, current state, and elapsed waiting time

### Requirement: Kitchen initial load and fallback endpoint
The backend SHALL provide `GET /api/v1/cocina/pedidos` for initial KDS loading and fallback polling by users with role `COCINA`, `PEDIDOS`, or `ADMIN`.

#### Scenario: Authorized user loads kitchen queue
- **GIVEN** an authenticated user has role `COCINA`, `PEDIDOS`, or `ADMIN`
- **WHEN** they call `GET /api/v1/cocina/pedidos`
- **THEN** the backend returns HTTP 200 with the current kitchen queue

#### Scenario: Unauthorized user cannot load kitchen queue
- **GIVEN** an authenticated user lacks roles `COCINA`, `PEDIDOS`, and `ADMIN`
- **WHEN** they call `GET /api/v1/cocina/pedidos`
- **THEN** the backend rejects the request with HTTP 403

### Requirement: Kitchen live updates
The backend SHALL provide a kitchen live-update channel at `WS /api/v1/cocina/ws` that authenticates the JWT handshake and allows only roles `COCINA`, `PEDIDOS`, or `ADMIN`.

#### Scenario: Authorized WebSocket connection is accepted
- **GIVEN** a valid JWT for a user with role `COCINA`, `PEDIDOS`, or `ADMIN`
- **WHEN** the user opens `WS /api/v1/cocina/ws`
- **THEN** the backend accepts the connection and registers it for kitchen events

#### Scenario: Missing or unauthorized WebSocket connection is rejected
- **GIVEN** a missing, invalid, expired, or insufficient-role JWT
- **WHEN** the user opens `WS /api/v1/cocina/ws`
- **THEN** the backend rejects or closes the connection without registering it for events

### Requirement: Kitchen event semantics
The live-update channel SHALL publish kitchen events after committed order transitions and clients SHALL apply them to keep KDS cards synchronized without page reload.

#### Scenario: Confirmed order appears on KDS
- **GIVEN** an order transitions from `PENDIENTE` to `CONFIRMADO`
- **WHEN** the transaction commits and `PEDIDO_CONFIRMADO` is published
- **THEN** connected KDS clients add the order to the `CONFIRMADO` column without reloading

#### Scenario: Preparation started moves KDS card
- **GIVEN** an order transitions from `CONFIRMADO` to `EN_PREPARACION`
- **WHEN** the transaction commits and `PEDIDO_EN_PREPARACION` is published
- **THEN** connected KDS clients move the order to the `EN_PREPARACION` column without reloading

#### Scenario: Finished order leaves KDS
- **GIVEN** an order transitions from `EN_PREPARACION` to `EN_CAMINO`
- **WHEN** the transaction commits and `PEDIDO_EN_CAMINO` is published
- **THEN** connected KDS clients remove the order from the kitchen display

#### Scenario: Cancelled kitchen order leaves KDS
- **GIVEN** an order in `CONFIRMADO` or `EN_PREPARACION` transitions to `CANCELADO`
- **WHEN** the transaction commits and `PEDIDO_CANCELADO` is published
- **THEN** connected KDS clients remove the order from the kitchen display

### Requirement: Kitchen screen resilience
The KDS SHALL indicate live connection status, poll `GET /api/v1/cocina/pedidos` every 30 seconds while disconnected, and refresh full state after reconnecting.

#### Scenario: WebSocket disconnect activates fallback polling
- **GIVEN** the KDS was connected to the kitchen live-update channel
- **WHEN** the WebSocket disconnects
- **THEN** the KDS shows a disconnected-live indicator and refreshes the kitchen queue by polling every 30 seconds

#### Scenario: Reconnect refreshes full state
- **GIVEN** the KDS has been polling because the WebSocket was disconnected
- **WHEN** the WebSocket reconnects
- **THEN** the KDS fetches the full kitchen queue and resumes live event handling

### Requirement: Kitchen urgency indicators
The KDS SHALL calculate and display urgency from the elapsed time since the order entered `CONFIRMADO`, recalculating client-side every 15 seconds.

#### Scenario: Urgency thresholds are applied
- **GIVEN** kitchen orders have kitchen-entry timestamps
- **WHEN** the KDS renders or recalculates timers
- **THEN** orders under 10 minutes use normal styling, orders from 10 to 20 minutes use warning styling, and orders over 20 minutes use urgent styling

### Requirement: Kitchen new-order alert
The KDS SHALL provide an optional visual and audio alert for new confirmed orders, with a sound toggle persisted locally.

#### Scenario: New order triggers alert
- **GIVEN** sound alerts are enabled after the user has interacted with the KDS
- **WHEN** the KDS receives `PEDIDO_CONFIRMADO`
- **THEN** it plays a local beep and displays a brief visual flash

#### Scenario: Sound preference is persisted
- **GIVEN** a kitchen user changes the sound alert toggle
- **WHEN** they leave and later reopen the KDS in the same browser
- **THEN** the KDS restores the toggle from local storage
