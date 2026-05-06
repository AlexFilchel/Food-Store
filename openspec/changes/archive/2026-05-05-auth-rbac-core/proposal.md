## Why

Food Store necesita identidad, sesiones y permisos antes de exponer cualquier flujo protegido de catálogo administrativo, perfil, direcciones, carrito autenticado, pedidos u operación interna. Este change convierte la fundación técnica ya archivada en una capacidad usable de autenticación y autorización con contratos de seguridad explícitos.

## What Changes

- Implementar registro de clientes con password hasheada y asignación automática de rol `CLIENT`.
- Implementar login con JWT access token, refresh token opaco, respuesta uniforme ante credenciales inválidas y rate limiting.
- Implementar refresh token con almacenamiento hasheado, rotación obligatoria y defensa ante replay attack.
- Implementar logout revocando el refresh token activo sin invalidar access tokens stateless ya emitidos.
- Implementar `GET /api/v1/auth/me` para reconstruir sesión del usuario autenticado.
- Implementar dependencias reutilizables de backend para `get_current_user`, `require_role(...)` y ownership básico.
- Implementar modelo/repositorio/servicio de refresh tokens y extender identity según sea necesario sin romper seeds fundacionales.
- Agregar endpoints, schemas, errores estables y tests críticos para auth, RBAC, refresh rotation, replay y rate limiting.
- Preparar integración frontend mínima sobre `auth-store` y cliente HTTP compartido para consumir login/logout/refresh/me sin construir todavía el shell protegido completo.

## Capabilities

### New Capabilities

- `auth-rbac-core`: Cubre registro, login, refresh, logout, `/auth/me`, JWT, RBAC, ownership básico, refresh token rotation/replay handling y rate limiting de autenticación.

### Modified Capabilities

- Ninguna. El change consume las capacidades fundacionales existentes (`backend-foundation`, `data-foundation`, `api-contracts`, `frontend-foundation`) sin cambiar sus requisitos archivados.

## Impact

- Backend FastAPI: nuevos módulos o extensión de `backend/app/modules/identity` y `backend/app/modules/auth`, routers bajo `/api/v1/auth`, servicios, repositorios, schemas y dependencias de seguridad.
- Base de datos: nueva migración para refresh tokens hasheados, metadatos de expiración, revocación, rotación y familia/sesión de tokens; no se modifica manualmente la migración inicial archivada.
- Configuración: uso de expiraciones existentes para access/refresh y agregado de configuración necesaria para rate limiting si falta.
- API contracts: todos los errores usan RFC 7807 extendido con `code`, `timestamp` y `errors[]` cuando aplique.
- Frontend React: integración mínima de auth store y HTTP client con endpoints reales; rutas protegidas y layout completo quedan para `frontend-shell-access-control`.
- Seguridad: bcrypt con cost factor >= 10, JWT HS256 configurable, refresh token opaco guardado solo como hash, roles por `code` semántico y validación server-side obligatoria.
