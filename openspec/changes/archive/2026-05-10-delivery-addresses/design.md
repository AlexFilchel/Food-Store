## Context

`delivery-addresses` es el change 9 del roadmap y depende de `auth-rbac-core`, `frontend-shell-access-control` y `customer-profile`. El cliente ya tiene identidad autenticada y perfil propio; ahora necesita administrar direcciones de entrega antes de carrito/checkout. Las direcciones serán consumidas luego por validación de checkout y creación de pedidos, donde se necesitará snapshot inmutable.

## Goals / Non-Goals

**Goals:**
- Permitir CRUD autenticado de direcciones propias.
- Aplicar ownership estricto por `current_user.id`, sin aceptar `user_id` desde cliente.
- Mantener una única dirección predeterminada por usuario con operación atómica.
- Excluir direcciones eliminadas de list/detail/update/delete por defecto.
- Dejar payloads suficientes para checkout futuro: destinatario, teléfono, calle, número, piso/depto opcional, ciudad/localidad, provincia, código postal, referencias.
- Implementar UI protegida para listar, crear, editar, eliminar y marcar dirección predeterminada.

**Non-Goals:**
- No calcular costos de envío ni zonas de cobertura.
- No validar geocoding externo.
- No crear pedidos ni snapshots de pedido todavía.
- No administrar direcciones de otros usuarios desde panel admin.
- No introducir múltiples direcciones predeterminadas por tipo de entrega.

## Decisions

1. **Módulo dedicado `delivery_addresses`**
   - Decisión: crear módulo backend separado para model/repository/service/router.
   - Alternativa: meterlo en `customer_profile`. Se descarta porque las direcciones tienen ciclo de vida propio y serán dependencia de checkout/pedidos.

2. **Endpoint account-owned bajo `/api/v1/customer/addresses`**
   - Decisión: rutas protegidas para recursos propios del usuario autenticado.
   - Alternativa: `/users/{id}/addresses`. Se descarta porque aumenta riesgo IDOR y mezcla con futura administración.

3. **Nueva tabla con soft delete**
   - Decisión: crear `delivery_addresses` con `user_id`, campos de dirección, `is_default`, audit fields y `deleted_at`.
   - Alternativa: hard delete. Se descarta porque pedidos futuros necesitarán trazabilidad/snapshots y porque soft delete evita romper referencias si aparecen después.

4. **Única default por usuario resuelta en servicio/transacción**
   - Decisión: cuando una dirección se marca default, el servicio desmarca las demás del mismo usuario dentro de la misma UoW.
   - Alternativa: confiar solo en frontend. Se descarta porque la invariancia debe vivir en backend.

5. **Primera dirección puede quedar default automáticamente**
   - Decisión: si el usuario no tiene direcciones activas, la primera creada queda `is_default=true`; si crea otra con `is_default=true`, se desmarca la anterior.
   - Alternativa: exigir acción manual. Se descarta porque checkout necesita una opción usable y reduce fricción.

6. **Payload explícito y no sensible**
   - Decisión: las respuestas exponen solo campos de dirección y timestamps; nunca datos de auth ni `user_id` si no hace falta para UI.
   - Alternativa: devolver entidad DB completa. Se descarta por acoplamiento y exposición innecesaria.

## Risks / Trade-offs

- **Riesgo: dos defaults por concurrencia** → Mitigar en servicio con actualización atómica dentro de UoW; considerar índice parcial único por usuario/default/no-deleted si el stack lo permite limpiamente.
- **Riesgo: dirección borrada usada por checkout** → Mitigar en futuros changes validando que checkout solo acepte direcciones activas y creando snapshot al crear pedido.
- **Riesgo: campos de dirección insuficientes** → Mitigar manteniendo campos básicos extensibles y referencias libres; zonas/cobertura quedan fuera de este change.
- **Trade-off: sin geocoding** → Reduce complejidad e integración externa; se valida formato mínimo, no existencia real.

## Migration Plan

1. Crear migración Alembic para `delivery_addresses`.
2. Implementar módulo backend y registrar router.
3. Agregar data layer/frontend UI protegida.
4. Agregar tests backend/frontend.
5. Rollback: remover UI/router/módulo y revertir migración si no hay datos productivos; si hay datos, exportar/respaldar antes de downgrade.

## Open Questions

- ¿Qué campos exactos exige negocio para Argentina/operación local? Recomendación inicial: `recipient_name`, `phone`, `street`, `street_number`, `floor`, `apartment`, `city`, `province`, `postal_code`, `reference`.
- ¿El teléfono debe validarse con formato estricto? Recomendación inicial: longitud/formato laxo, normalización futura cuando se defina cobertura/logística.
