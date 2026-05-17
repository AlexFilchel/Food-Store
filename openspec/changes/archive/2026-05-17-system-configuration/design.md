## Context

Food Store ya cuenta con autenticación/RBAC, pedidos operativos, métricas administrativas y shell frontend protegido. El roadmap ubica `system-configuration` al final porque recién ahora están claros los parámetros que conviene operar sin tocar código.

El riesgo principal es convertir esta capacidad en una “bolsa de settings” que permita cambiar cualquier cosa y oculte decisiones de diseño. Por eso el diseño parte de una regla fuerte: **solo se pueden modificar claves whitelisted, tipadas y validadas por el backend**. La base de datos guarda valores efectivos y auditoría, pero la definición de cada clave vive en código para mantener contratos explícitos.

## Goals / Non-Goals

**Goals:**

- Permitir a `ADMIN` consultar y actualizar parámetros globales operativos desde una pantalla administrativa.
- Persistir overrides de configuración con tipos, validaciones, defaults seguros y auditoría append-only.
- Exponer configuración efectiva para módulos internos y, cuando corresponda, un subconjunto público seguro para frontend cliente.
- Evitar que secretos, infraestructura o reglas estructurales del dominio se editen desde UI.
- Dejar una base extensible para sumar nuevas claves de configuración sin romper consumidores existentes.

**Non-Goals:**

- No implementar un sistema genérico de feature flags arbitrarios.
- No permitir editar roles, permisos, estados canónicos de pedido/pago ni máquinas de estado.
- No almacenar secretos, tokens, credenciales, webhooks, claves de MercadoPago ni variables de infraestructura.
- No reemplazar migraciones de base de datos ni decisiones arquitectónicas con filas editables.
- No cambiar fórmulas históricas ya documentadas; si una configuración afecta cálculos futuros, debe quedar versionada/auditada.

## Decisions

### 1. Definiciones de settings en código + valores en base de datos

**Decisión:** cada setting tendrá una definición canónica en código: `key`, `type`, `category`, `default`, `visibility`, `editable`, `validation`, `description` y `sensitivity`. La base de datos almacena solo overrides y auditoría.

**Rationale:** mantiene el contrato explícito y evita una tabla genérica sin semántica. Si mañana agregamos una clave nueva, se agrega primero al registry del backend y luego puede tener valor en DB.

**Alternativas consideradas:**

- **Tabla completamente dinámica:** flexible, pero peligrosa; permite esconder reglas de negocio y rompe testabilidad.
- **Solo archivo/env vars:** simple, pero obliga deploy para cambios operativos y no deja auditoría de administración.

### 2. Catálogo inicial acotado de configuración

**Decisión:** el primer release incluye solo claves realmente operables:

- `business.timezone` (`string`, timezone IANA, default `America/Argentina/Buenos_Aires`): timezone efectiva para métricas/reportes y visualizaciones operativas.
- `store.ordering_enabled` (`boolean`, default `true`): permite pausar creación de nuevos pedidos sin apagar catálogo/login.
- `store.public_name` (`string`, default `Food Store`): nombre público del negocio.
- `store.contact_phone` (`string|null`): teléfono público opcional.
- `store.contact_email` (`string|null`): email público opcional.
- `store.address_text` (`string|null`): dirección pública opcional.
- `orders.max_items_per_order` (`integer`, default `50`, min `1`, max `200`): límite operativo del tamaño del pedido.
- `orders.max_quantity_per_item` (`integer`, default `20`, min `1`, max `99`): límite por línea de carrito/pedido.
- `orders.pending_payment_expiration_minutes` (`integer`, default `30`, min `5`, max `1440`): ventana operativa para considerar pago pendiente vencible por procesos existentes/futuros.

**Rationale:** son parámetros operables sin cambiar estructura del dominio. El catálogo evita tocar roles, estados, permisos o formas de pago canónicas.

**Alternativas consideradas:**

- Incluir formas de pago administrables: se descarta para este change porque impacta integración de pagos y contratos de checkout.
- Incluir estados de pedido administrables: se descarta porque rompería FSM y auditoría.

### 3. Endpoints administrativos y endpoint público separado

**Decisión:** exponer endpoints separados:

- `GET /api/v1/admin/system/configuration` — lista configuración efectiva y metadata editable para admin.
- `PATCH /api/v1/admin/system/configuration` — actualiza una o varias claves permitidas atómicamente.
- `GET /api/v1/system/configuration/public` — devuelve únicamente claves públicas no sensibles necesarias para UI cliente.

**Rationale:** separa seguridad y superficie pública. El endpoint admin incluye metadata para renderizar formularios; el público nunca expone claves internas ni audit data.

**Alternativas consideradas:**

- Un solo endpoint con filtros por rol: más propenso a filtraciones accidentales.
- Endpoints por categoría: más verboso sin beneficio inicial; puede agregarse luego si crece mucho.

### 4. Actualización atómica con validación completa antes de persistir

**Decisión:** `PATCH` valida todas las claves y valores antes de escribir. Si una clave falla, no se persiste ningún cambio. La respuesta devuelve configuración efectiva actualizada y audit entries creadas.

**Rationale:** evita estados parciales en operaciones administrativas y simplifica UX: o todo se guarda, o se muestran errores por campo.

**Alternativas consideradas:**

- Persistencia parcial por clave: más flexible, pero complica auditoría y feedback de errores.

### 5. Auditoría append-only

**Decisión:** cada cambio guarda `key`, `old_value`, `new_value`, `changed_by_user_id`, `changed_at`, `reason` opcional y `request_id` si existe.

**Rationale:** configuración operativa afecta comportamiento del sistema. Necesitamos trazabilidad para soporte y diagnóstico.

**Alternativas consideradas:**

- Solo `updated_at/updated_by` en la tabla de configuración: insuficiente para reconstruir cambios.

### 6. Frontend con server state, formularios por tipo y confirmación de cambios sensibles

**Decisión:** la página admin renderiza categorías y campos según metadata del backend. Usa TanStack Query para lectura/mutación, muestra diff antes de guardar y pide confirmación para claves que afecten operación (`ordering_enabled`, límites de pedidos, expiración de pago pendiente).

**Rationale:** reduce duplicación de validaciones en UI pero mantiene UX clara. El backend sigue siendo autoridad.

**Alternativas consideradas:**

- Formulario hardcodeado completo en frontend: rápido, pero duplica metadata y se desincroniza fácil.

## Risks / Trade-offs

- **Riesgo: alcance crece hasta volverse “settings para todo”.** → Mitigación: registry whitelisted en código, review obligatorio para nuevas claves y non-goals explícitos.
- **Riesgo: cambios de configuración rompen flujos críticos.** → Mitigación: validación estricta, rangos seguros, actualización atómica y tests de consumidores críticos.
- **Riesgo: configuración pública filtra datos internos.** → Mitigación: campo `visibility` (`admin_only`/`public`) y endpoint público separado que solo serializa allowlist pública.
- **Riesgo: múltiples admins editan al mismo tiempo.** → Mitigación: usar `version`/`updated_at` y detectar conflicto optimista si el cliente envía versión esperada.
- **Riesgo: cambios de timezone alteran interpretación de métricas.** → Mitigación: persistencia en UTC, timezone solo para agrupación/visualización y auditoría del momento del cambio.
- **Trade-off: registry en código requiere deploy para nuevas claves.** → Se acepta porque protege contratos y evita configuración dinámica peligrosa.