## Context

`customer-profile` es el change 8 del roadmap y depende de `auth-rbac-core` y `frontend-shell-access-control`. Hoy el backend ya tiene usuarios, contraseña hasheada, `/auth/me`, JWT, RBAC y helpers de ownership; el frontend ya tiene shell autenticado, auth-store y una página cliente placeholder (`/app`). Falta que el cliente pueda gestionar sus datos propios antes de que `delivery-addresses` y checkout dependan de identidad confiable.

## Goals / Non-Goals

**Goals:**
- Permitir al usuario autenticado consultar su perfil propio.
- Permitir actualizar `first_name`, `last_name` y `email` propios con validación y errores canónicos.
- Permitir cambiar contraseña validando contraseña actual y política de contraseña existente.
- Mantener hash de contraseña y metadata sensible fuera de toda respuesta.
- Actualizar el estado frontend de sesión tras cambios exitosos de perfil.
- Reemplazar el placeholder cliente por una UI protegida de perfil y credenciales.

**Non-Goals:**
- No implementar administración de usuarios ni asignación de roles.
- No implementar recuperación de contraseña por email.
- No implementar direcciones de entrega.
- No invalidar globalmente todos los refresh tokens por cambio de contraseña salvo que se decida explícitamente en apply.
- No agregar campos nuevos de perfil que requieran migración.

## Decisions

1. **Endpoint de cuenta propia separado de `/auth/me`**
   - Decisión: agregar rutas autenticadas bajo `/api/v1/customer/profile` para lectura/edición/cambio de contraseña.
   - Alternativa: extender `/auth/me` con PATCH. Se descarta porque `/auth/me` queda como contrato de sesión y bootstrap; perfil propio es capability de dominio cliente.

2. **Reutilizar tabla `users` sin migración**
   - Decisión: el alcance usa `first_name`, `last_name`, `full_name`, `email` y `hashed_password` existentes.
   - Alternativa: crear tabla `customer_profiles`. Se descarta por sobrearquitectura para datos ya presentes y porque direcciones serán capability separada.

3. **Ownership implícito por token**
   - Decisión: los endpoints operan siempre sobre `current_user.id`; el cliente nunca envía `user_id`.
   - Alternativa: usar `/users/{id}/profile`. Se descarta porque aumenta riesgo de IDOR y mezcla con futura administración.

4. **Cambio de email con unicidad estricta**
   - Decisión: si el nuevo email pertenece a otro usuario activo/no eliminado, devolver error canónico estable.
   - Alternativa: permitir duplicados hasta verificación posterior. Se descarta porque rompe login y ownership.

5. **Cambio de contraseña exige contraseña actual**
   - Decisión: validar `current_password`, `new_password` y política bcrypt existente.
   - Alternativa: permitir cambio solo con sesión activa. Se descarta porque una sesión robada podría tomar la cuenta sin fricción adicional.

6. **Frontend conserva auth-store como fuente de sesión**
   - Decisión: tras actualización exitosa, actualizar `auth-store.user` con el perfil devuelto.
   - Alternativa: forzar logout/login. Se descarta porque empeora UX sin aumentar seguridad para cambios no sensibles.

## Risks / Trade-offs

- **Riesgo: duplicar contrato entre `/auth/me` y perfil** → Mitigar usando schemas compatibles y mapeo único de usuario público.
- **Riesgo: exposición de hash o roles editables** → Mitigar con schemas de respuesta explícitos y tests de ausencia de campos sensibles.
- **Riesgo: email cambiado deja token con claim viejo** → Mitigar actualizando frontend con payload del perfil; el backend debe confiar en subject/user id del token, no en email claim para autorización. El refresh/login posterior emitirá claim actualizado.
- **Riesgo: cambio de contraseña no revoca sesiones existentes** → Documentarlo como trade-off inicial; si negocio exige cierre global de sesiones, será un ajuste explícito.

## Migration Plan

1. Agregar schemas/servicio/router de perfil propio reutilizando `users`.
2. Registrar router protegido sin migraciones de DB.
3. Agregar cliente/hooks/UI frontend bajo la página cliente.
4. Agregar tests backend y frontend del flujo crítico.
5. Rollback: remover router/cliente/UI de perfil y restaurar `AppPage` placeholder; no hay migración de datos que revertir.

## Open Questions

- ¿Cambiar email debe revocar refresh tokens activos? Recomendación inicial: no para este change, porque no hay verificación de email; considerar endurecerlo cuando exista recuperación/verificación.
- ¿La UI debe pedir repetir nueva contraseña? Recomendación: sí en frontend para UX, backend solo necesita `current_password` y `new_password`.
