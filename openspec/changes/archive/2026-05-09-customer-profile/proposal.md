## Why

El cliente autenticado ya puede registrarse, iniciar sesión y entrar al shell protegido, pero todavía no puede autogestionar sus datos personales ni cambiar su contraseña. Este change cierra la capacidad de cuenta mínima antes de avanzar a direcciones de entrega y checkout, donde el ownership del cliente empieza a ser crítico.

## What Changes

- Agregar endpoints autenticados para consultar y actualizar el perfil propio del cliente.
- Agregar endpoint autenticado para cambiar contraseña validando contraseña actual y política de seguridad existente.
- Mantener `/auth/me` como contrato de sesión actual, sin exponer hashes ni metadata sensible.
- Agregar UI protegida de perfil en el espacio cliente para ver/editar nombre, apellido y email.
- Agregar UI protegida para cambio de contraseña con errores canónicos y preservación segura de estado.
- Actualizar estado frontend de sesión cuando el perfil propio cambia correctamente.
- Agregar pruebas backend y frontend del flujo crítico.

## Capabilities

### New Capabilities
- `customer-profile`: autogestión autenticada del perfil propio y cambio de contraseña del cliente.

### Modified Capabilities
- None.

## Impact

- Backend: `backend/app/modules/auth/` o módulo dedicado de perfil agregará schemas, servicio y router autenticado para perfil propio.
- Backend data: reutiliza tabla `users`; no requiere migración si el alcance se limita a `first_name`, `last_name`, `email` y `hashed_password` existentes.
- Backend API: nuevos endpoints protegidos bajo `/api/v1/customer/profile` o ruta equivalente de cuenta propia.
- Frontend: `frontend/src/pages/app-page/` deja de ser placeholder y pasa a renderizar gestión de perfil cliente.
- Frontend state: `auth-store` debe reflejar cambios exitosos del usuario autenticado.
- Tests/specs: nueva spec OPSX con ownership, validación, errores y no exposición de datos sensibles.
