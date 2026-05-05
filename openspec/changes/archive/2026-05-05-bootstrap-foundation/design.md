## Context

Food Store es un e-commerce de alimentos con backend FastAPI, frontend React/TypeScript, PostgreSQL, MercadoPago, RBAC y operación administrativa. La documentación del proyecto ya define dominio, actores, ERD, reglas de negocio y roadmap; el repositorio actual necesita convertir esa visión en una fundación ejecutable y verificable.

El change `bootstrap-foundation` es transversal: toca estructura de proyecto, runtime backend, runtime frontend, persistencia, contratos API, seeds, migraciones, seguridad básica de configuración y convenciones de desarrollo. Por eso debe cerrar decisiones que los changes posteriores van a consumir.

## Goals / Non-Goals

**Goals:**

- Dejar `backend/` y `frontend/` arrancables localmente con comandos documentados.
- Establecer arquitectura backend feature-first con flujo `Router -> Service -> UnitOfWork -> Repository -> Model`.
- Establecer frontend con Feature-Sliced Design y separación estricta entre server state y client state.
- Configurar PostgreSQL mediante SQLModel/SQLAlchemy Async y Alembic.
- Crear migración inicial y seed idempotente para catálogos obligatorios.
- Definir contratos canónicos para errores, paginación, dinero, fechas, naming e identificadores.
- Agregar tests mínimos para asegurar que la fundación no sea solo scaffolding decorativo.

**Non-Goals:**

- No implementar login, registro, refresh, logout ni guards completos por rol.
- No implementar CRUD real de usuarios, categorías, ingredientes, productos, pedidos, pagos ni administración.
- No integrar todavía MercadoPago más allá de variables/configuración base.
- No construir UI final ni sistema visual definitivo.
- No resolver métricas, configuración dinámica ni workflows operativos.

## Decisions

### 1. Monorepo con backend y frontend separados

Se mantendrá una raíz con carpetas `backend/` y `frontend/`, más `docs/` y `openspec/`.

**Rationale:** separa runtimes, dependencias y comandos sin forzar un workspace complejo antes de necesitarlo.

**Alternativas consideradas:**

- Workspace único npm/pnpm para todo: útil si hubiera paquetes compartidos, pero agrega complejidad temprana.
- Repos separados: reduce acoplamiento, pero complica coordinación para un TPI full-stack.

### 2. Backend FastAPI feature-first

El backend usará módulos verticales bajo `backend/app/modules/<feature>/`, con archivos típicos `model.py`, `schemas.py`, `repository.py`, `service.py` y `router.py` cuando el módulo tenga comportamiento real.

La fundación debe crear `core/` para configuración, base de datos, errores, logging, seguridad base, UoW y repositorio genérico.

```text
backend/app/
├── core/
│   ├── config.py
│   ├── database.py
│   ├── errors.py
│   ├── logging.py
│   ├── repository.py
│   ├── security.py
│   └── uow.py
├── modules/
│   └── ...
└── main.py
```

**Rationale:** el proyecto va a crecer por dominios. Feature-first evita carpetas horizontales gigantes y hace visible dónde vive cada capacidad.

**Alternativas consideradas:**

- Arquitectura por capas globales (`routers/`, `services/`, `models/`): simple al inicio, peor para escalar por dominio.
- Clean Architecture completa con puertos/adaptadores desde el día uno: muy robusta, pero excesiva para el tamaño actual.

### 3. Unit of Work como frontera transaccional

Los servicios no harán commit/rollback directamente; operarán a través de un `UnitOfWork` que administra la sesión y expone repositorios.

```text
Router -> Service -> UnitOfWork -> Repository -> Model
```

**Rationale:** pedidos, pagos y stock van a requerir atomicidad. Meter UoW desde la base evita rediseñar cuando llegue `order-creation-core`.

**Alternativas consideradas:**

- Pasar `AsyncSession` directo a servicios: más rápido, pero difumina transacciones.
- Repositorios sin UoW: suficiente para CRUD simple, insuficiente para operaciones compuestas.

### 4. SQLModel + SQLAlchemy Async + Alembic

Se usará SQLModel para modelos y schemas cercanos al dominio, SQLAlchemy Async para acceso a PostgreSQL y Alembic para migraciones.

**Rationale:** encaja con FastAPI/Pydantic y permite migraciones formales sin abandonar SQLAlchemy.

**Alternativas consideradas:**

- SQLAlchemy puro: más explícito, pero duplica más schemas.
- ORM síncrono: más simple, pero contradice la arquitectura async definida.

### 5. Identificadores de catálogos: ID estable + code semántico único

Roles, estados y formas de pago tendrán ID estable para seeds y relaciones simples, más `code` semántico único para lógica, permisos, APIs y legibilidad.

**Regla:** el código de negocio y el frontend deben referenciar `code`; el ID queda como detalle persistente estable.

**Rationale:** resuelve la ambigüedad documental entre IDs numéricos y claves semánticas sin perder ventajas de ninguna opción.

**Alternativas consideradas:**

- Solo IDs numéricos: eficiente, pero menos expresivo y más frágil en frontend/specs.
- Solo PK semántica: legible, pero obliga a FKs string en todo el modelo.

### 6. Contrato de errores RFC 7807 extendido

La API adoptará Problem Details como contrato base:

```json
{
  "type": "https://food-store/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request contains invalid fields.",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-05-05T15:00:00Z",
  "errors": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

**Rationale:** frontend, tests y logs necesitan un contrato uniforme. El `code` estable evita depender de textos humanos.

**Alternativas consideradas:**

- `{"detail": "..."}` simple de FastAPI: rápido, pero pobre para UI y debugging.
- Formato ad-hoc por endpoint: inaceptable; rompe consistencia.

### 7. Paginación canónica `page/size`

Los listados usarán `page` y `size` con respuesta:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "size": 20,
  "pages": 0
}
```

**Rationale:** es más natural para UI y paginadores que `skip/limit`. Internamente puede traducirse a offset.

**Alternativas consideradas:**

- `skip/limit`: útil para backend, menos amigable para frontend.
- Cursor pagination: mejor para feeds grandes, innecesario para la fundación.

### 8. Dinero y fechas

- Dinero: `NUMERIC(10,2)` en PostgreSQL y `Decimal` en Python. Nunca `float`.
- Fechas: timestamps timezone-aware persistidos en UTC y enviados en ISO 8601.

**Rationale:** pedidos, pagos y métricas no toleran errores de precisión ni ambigüedad horaria.

### 9. Frontend Feature-Sliced Design

El frontend se organizará en capas:

```text
frontend/src/
├── app/
├── pages/
├── widgets/
├── features/
├── entities/
└── shared/
```

Regla de dependencia: capas superiores pueden importar de inferiores; no al revés.

**Rationale:** el frontend va a mezclar catálogo, carrito, checkout, auth y admin. FSD evita que todo termine en `components/`.

### 10. Estado frontend: TanStack Query vs Zustand

- TanStack Query: server state remoto cacheable.
- Zustand: estado cliente local como carrito, sesión UI y preferencias.

**Rationale:** evita duplicar datos del servidor en stores globales, uno de los errores más caros en React.

### 11. Variables de entorno y secretos

Se versionarán `.env.example`, nunca `.env`. La configuración deberá validar faltantes críticos al inicio.

**Rationale:** evita configuraciones fantasma y secretos commiteados.

## Risks / Trade-offs

- **Riesgo: foundation demasiado grande** → Mitigación: limitar el alcance a estructura, contratos, migración/seed base y tests mínimos; no meter features de negocio.
- **Riesgo: exceso de abstracción temprana** → Mitigación: crear patrones base livianos y extenderlos solo cuando el primer feature real lo necesite.
- **Riesgo: documentación y código vuelven a divergir** → Mitigación: tasks deben incluir actualización de README/docs y validación contra specs antes de archivar.
- **Riesgo: contratos decididos tarde** → Mitigación: cerrar errores, paginación, fechas, dinero e identificadores en este change.
- **Riesgo: seed no idempotente** → Mitigación: usar IDs/codes explícitos y upserts o lógica equivalente.
- **Riesgo: frontend shell se confunda con auth completa** → Mitigación: dejar solo providers, rutas placeholder y base técnica; guards reales quedan para changes posteriores.

## Migration Plan

1. Crear estructura de backend y frontend dentro del monorepo.
2. Agregar dependencias y configuración base.
3. Crear modelos fundacionales y migración inicial.
4. Crear seed idempotente.
5. Agregar tests mínimos de arranque, healthcheck, contrato de errores y seed.
6. Documentar setup local.

Rollback: al ser fundacional y sin datos productivos previos, el rollback consiste en revertir el change y/o ejecutar downgrade de Alembic si ya se aplicó la migración localmente.

## Open Questions

- ¿Se usará npm, pnpm o yarn para el frontend? Por defecto se propone npm por simplicidad del entorno académico.
- ¿Se usará `python-jose` o PyJWT para JWT? Por compatibilidad con documentación actual se propone `python-jose`, pero se puede cambiar antes de `auth-rbac-core`.
- ¿El proyecto requiere Docker Compose desde la fundación? Se recomienda opcional, no obligatorio, para no bloquear entornos Windows simples.
