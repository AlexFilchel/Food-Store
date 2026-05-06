## Context

`bootstrap-foundation` dejó el monorepo, FastAPI, React/Vite, PostgreSQL async, Alembic, seeds fundacionales, errores RFC 7807 extendidos, roles con `code` semántico y el flujo backend `Router -> Service -> UnitOfWork -> Repository -> Model`. El roadmap marca `auth-rbac-core` como segundo change porque las capacidades siguientes dependen de identidad, roles, ownership y sesión autenticada.

La documentación de dominio exige cuatro roles fijos (`ADMIN`, `STOCK`, `PEDIDOS`, `CLIENT`), access tokens JWT de 30 minutos, refresh tokens de 7 días, rotación de refresh, detección de replay attack, login rate-limited y respuestas seguras que no filtren si un email existe.

## Goals / Non-Goals

**Goals:**

- Entregar una vertical backend completa de autenticación: registro, login, refresh, logout y `/auth/me`.
- Dejar RBAC server-side reutilizable para futuros módulos mediante dependencias/guards, no lógica duplicada en routers.
- Definir e implementar la estrategia canónica de refresh tokens: token opaco en cliente, hash en BD, rotación y revocación por familia ante replay.
- Usar roles por `code` semántico y preservar IDs estables en persistencia.
- Respetar errores RFC 7807 extendidos, timestamps UTC, schemas Pydantic separados y arquitectura por capas.
- Dejar pruebas críticas de seguridad y autorización listas para proteger cambios posteriores.
- Integrar mínimamente el frontend existente con endpoints reales de auth cuando sea necesario para validar el contrato.

**Non-Goals:**

- No construir el shell visual completo, navegación por rol ni guards de rutas frontend; eso corresponde a `frontend-shell-access-control`.
- No implementar CRUD completo de usuarios ni administración avanzada de usuarios; `user-administration` lo extenderá.
- No implementar recuperación de contraseña, verificación de email ni MFA.
- No implementar ownership específico de direcciones, pedidos o perfil; solo helpers/base reutilizable.
- No introducir Redis salvo que sea necesario por la implementación elegida; el rate limiting puede iniciar in-memory/local si queda documentada su limitación.

## Decisions

### 1. Refresh token opaco con hash persistido

El cliente recibirá un refresh token opaco de alta entropía; la base de datos almacenará solamente `token_hash`, nunca el valor plano.

- **Rationale:** si la BD se filtra, los refresh tokens no son usables directamente. Además evita acoplar el refresh token a JWT claims que dificultan revocación fina.
- **Alternativas consideradas:** refresh JWT stateless. Se descarta porque complica logout, replay detection y revocación por familia.

### 2. Rotación obligatoria y familia de refresh tokens

Cada refresh exitoso revoca/marca como usado el token anterior y emite un nuevo refresh token dentro de la misma familia/sesión. Si se presenta un token ya usado o revocado, se revocan todos los tokens activos de esa familia o del usuario según el dato disponible.

- **Rationale:** reduce la ventana de robo de refresh tokens y permite detectar replay attack.
- **Trade-off:** requiere más campos y queries en BD, pero es el costo correcto para seguridad real. Seguridad sin estado acá sería humo, hermano.

### 3. Access JWT stateless de corta vida

El access token será JWT HS256 configurable, expiración de 30 minutos, con claims mínimos: subject/user id, email y roles por `code`.

- **Rationale:** permite autorización rápida y desacoplada sin query en cada check simple, pero `/auth/me` y `get_current_user` validan existencia/estado actual del usuario cuando el endpoint necesita usuario completo.
- **Trade-off:** logout no invalida access tokens ya emitidos; se acepta por su corta duración y se documenta explícitamente.

### 4. RBAC como dependencias reutilizables

Se implementarán `get_current_user` y `require_role(allowed_roles)` como dependencias de FastAPI. Los routers futuros deben declarar permisos, no reimplementar checks.

- **Rationale:** evita permisos dispersos y mantiene la arquitectura limpia. El frontend puede ocultar UI, pero la decisión de seguridad vive en backend.
- **Alternativas consideradas:** decorators ad-hoc por router. Se descartan por duplicación y menor testabilidad.

### 5. Ownership básico como helper reusable

El change dejará un mecanismo base para validar ownership por `user_id` o permitir bypass por roles privilegiados (`ADMIN` y, cuando aplique, roles operativos). La lógica concreta de cada dominio se implementará en su propio change.

- **Rationale:** futuros módulos necesitan una frontera común para “propietario o rol permitido”.
- **Trade-off:** no todos los dominios comparten la misma semántica de ownership, por eso se evita sobre-generalizar.

### 6. Rate limiting en login con fallback explícito

El endpoint de login deberá limitar intentos fallidos a 5 por IP en 15 minutos y responder HTTP 429 con `Retry-After`. La implementación preferida es `slowapi`; si no está instalado, este change debe agregarlo o implementar un limitador local documentado.

- **Rationale:** el roadmap menciona `slowapi` y el riesgo principal está en brute force de login.
- **Trade-off:** un limiter in-memory no escala horizontalmente; si se usa, debe quedar aislado para reemplazo por Redis/servicio externo.

### 7. Contratos API canónicos

Los endpoints serán bajo `/api/v1/auth`, JSON `snake_case`, status codes precisos y errores RFC 7807 extendidos con códigos estables como `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED`, `AUTH_REFRESH_REPLAY_DETECTED`, `AUTH_FORBIDDEN` y `AUTH_RATE_LIMITED`.

- **Rationale:** el frontend y los tests dependen de errores predecibles. No se mezclan formatos viejos de docs con la decisión fundacional archivada.

## Risks / Trade-offs

- **Replay detection incompleta por modelo insuficiente** → agregar campos `token_hash`, `family_id`, `rotated_from_id`, `expires_at`, `revoked_at`, `used_at`, `created_by_ip` y `user_agent` cuando sea razonable.
- **Rate limiting in-memory no sirve para múltiples instancias** → encapsular detrás de módulo propio y documentar migración futura a Redis si el despliegue lo requiere.
- **JWT roles desactualizados si cambian roles después de emitir token** → aceptar hasta expiración del access token; `/auth/me` siempre refleja estado actual desde BD.
- **Errores de credenciales pueden filtrar información** → login siempre devuelve 401 genérico para email inexistente o password inválida.
- **Frontend podría persistir más de lo necesario** → mantener persistencia mínima; el shell completo ajustará almacenamiento y guards en el siguiente change.

## Migration Plan

1. Crear migración Alembic nueva para tabla de refresh tokens y relaciones necesarias, sin editar la migración archivada de bootstrap.
2. Extender repositorios/UoW para acceder a usuarios, roles y refresh tokens.
3. Implementar servicios de password hashing, JWT y refresh rotation sobre `backend/app/core/security.py` o módulos equivalentes.
4. Registrar router `/api/v1/auth` en el router principal.
5. Agregar tests unitarios e integración para registro, login, refresh, replay, logout, `/me`, 401/403 y rate limiting.
6. Actualizar documentación mínima de setup/config si se agrega dependencia o variable nueva.

Rollback: revertir la migración nueva y retirar router/dependencias del módulo auth. La migración inicial de bootstrap no se toca.

## Open Questions

- ¿El refresh token se transportará en body JSON durante este change o en cookie httpOnly? Para mantener compatibilidad con los contratos existentes, el proposal asume body JSON; cookie httpOnly puede evaluarse después con impacto frontend.
- ¿El rate limiter usará `slowapi` desde este change o un adapter propio in-memory? La implementación debe decidirlo verificando dependencias actuales antes de codificar.
