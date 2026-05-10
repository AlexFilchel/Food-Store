## Why

El cliente ya puede autenticarse y autogestionar su perfil, pero todavía no puede guardar direcciones de entrega. Este change crea el insumo directo del checkout: direcciones propias, con ownership estricto y una única dirección predeterminada por usuario.

## What Changes

- Agregar persistencia para direcciones de entrega pertenecientes a un usuario autenticado.
- Agregar endpoints protegidos para listar, crear, actualizar, eliminar y marcar dirección predeterminada propia.
- Garantizar ownership por JWT: el cliente nunca envía ni controla `user_id`.
- Garantizar operación atómica para que exista como máximo una dirección predeterminada por usuario.
- Implementar soft delete o exclusión lógica de direcciones eliminadas para no romper futuros snapshots de pedidos.
- Agregar UI protegida en el área cliente para administrar direcciones.
- Agregar estados de carga/error/vacío/success y validaciones de formulario.
- Agregar pruebas backend/frontend del flujo crítico.

## Capabilities

### New Capabilities
- `delivery-addresses`: CRUD autenticado de direcciones propias y manejo de dirección predeterminada.

### Modified Capabilities
- None.

## Impact

- Backend: nuevo módulo de direcciones o cuenta cliente bajo `backend/app/modules/`, con model, schemas, repository, service y router.
- Backend data: nueva tabla de direcciones de entrega asociada a `users.id`, con audit fields y eliminación lógica.
- Backend API: nuevos endpoints protegidos bajo `/api/v1/customer/addresses` o ruta equivalente de recursos propios.
- Frontend: UI protegida en el espacio cliente para listar, crear, editar, eliminar y marcar dirección principal.
- Frontend data: cliente API, query keys/hooks y tests específicos de direcciones.
- Futuro: `checkout-preflight-validation` y `order-creation-core` consumirán estas direcciones para validar entrega y crear snapshots.
