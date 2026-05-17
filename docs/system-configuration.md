# System Configuration API

## Endpoints

- `GET /api/v1/admin/system/configuration`
  - Auth: Bearer token
  - Roles: `ADMIN`
  - Response: `items[]` con metadata completa por clave (tipo, categoría, editable, visibilidad, default, efectivo, validaciones, versión y `updated_at`).

- `PATCH /api/v1/admin/system/configuration`
  - Auth: Bearer token
  - Roles: `ADMIN`
  - Body:
    - `updates`: mapa por clave `{ value, expected_version? }`
    - `reason?`: motivo opcional de cambio
  - Semántica:
    - Validación completa previa a persistencia.
    - Operación atómica multi-key (si falla una clave, no persiste ninguna).
    - Concurrencia optimista por `expected_version`.
    - Auditoría append-only por cada clave realmente modificada.

- `GET /api/v1/system/configuration/public`
  - Auth: público
  - Response: `values` con solo claves `public` y no sensibles.

## Claves iniciales registradas

- `business.timezone` (`timezone`, default `America/Argentina/Buenos_Aires`)
- `store.ordering_enabled` (`boolean`, default `true`)
- `store.public_name` (`string`, default `Food Store`)
- `store.contact_phone` (`nullable_string`)
- `store.contact_email` (`nullable_string`)
- `store.address_text` (`nullable_string`)
- `orders.max_items_per_order` (`integer`, min `1`, max `200`, default `50`)
- `orders.max_quantity_per_item` (`integer`, min `1`, max `99`, default `20`)
- `orders.pending_payment_expiration_minutes` (`integer`, min `5`, max `1440`, default `30`)

## Errores canónicos

- `401` / `403` en endpoints administrativos según patrón global.
- `422 SYSTEM_CONFIGURATION_VALIDATION_ERROR`
  - Incluye `errors[]` con `field` + `message` por clave inválida.
- `409 SYSTEM_CONFIGURATION_STALE_VERSION`
  - Conflicto de concurrencia optimista (versión desactualizada).

## Auditoría

Cada cambio persistido genera un registro en `system_configuration_audit` con:

- `key`
- `old_value_json`
- `new_value_json`
- `changed_by_user_id`
- `changed_at`
- `reason` (opcional)
- `request_id` (opcional, vía `x-request-id`)

No se generan registros para:

- updates rechazados por validación,
- valores no-op (sin cambio efectivo).

## Integraciones de consumidores

- Dashboard metrics: si no se envía `timezone` en request, usa `business.timezone` efectiva.
- Checkout preflight y creación de pedido:
  - aplica `orders.max_items_per_order` y `orders.max_quantity_per_item` en backend,
  - respeta `store.ordering_enabled` para bloquear solo nuevos pedidos cuando está deshabilitado.
