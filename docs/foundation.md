# Foundation Contracts

## Naming

- Rutas API: `kebab-case` y prefijo `/api/v1`.
- Campos JSON: `snake_case` para mantener consistencia backend/frontend del proyecto.
- Códigos de catálogo: `UPPER_SNAKE_CASE` (`ADMIN`, `PENDING`, `MERCADOPAGO`).

## Error contract

Todas las respuestas de error usan RFC 7807 extendido:

```json
{
  "type": "https://food-store.local/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request contains invalid fields.",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-05-05T15:00:00Z",
  "instance": "/api/v1/contracts/pagination-example?page=0",
  "errors": [
    {
      "field": "page",
      "message": "Input should be greater than or equal to 1"
    }
  ]
}
```

## Pagination contract

Request:

- `page`: base 1
- `size`: items por página

Response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "size": 20,
  "pages": 0
}
```

## Time contract

- Persistencia: timestamps timezone-aware en UTC.
- Intercambio API: ISO8601 con sufijo `Z`.

## Money contract

- Backend: `Decimal`.
- Base de datos: `NUMERIC(10,2)`.
- Nunca usar `float` para montos de negocio.

## Catalog identifiers

- Persistencia: IDs numéricos estables.
- Integración/lógica/UI: `code` semántico único.

## Frontend state foundation

- Server state remoto: TanStack Query.
- Estado cliente local: Zustand.
- Stores fundacionales disponibles: `auth-store`, `cart-store`, `payment-store` y `ui-store`.
- Regla: no duplicar datos del servidor en stores globales.

## Repository safety

- Nunca commitear `.env`.
- Nunca commitear virtualenvs, `node_modules`, caches ni builds.
- Seeds deben ser idempotentes.
- Migraciones deben poder correrse desde una base vacía.
