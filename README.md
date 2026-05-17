# Food Store

Fundación técnica full-stack para el proyecto Food Store, con backend FastAPI + PostgreSQL/Alembic y frontend React + TypeScript + Vite.

## Responsabilidades del repo

- `backend/`: API, configuración, persistencia, migraciones, seed y tests backend.
- `frontend/`: aplicación React con FSD, Tailwind, TanStack Query y Zustand.
- `docs/`: documentación funcional, contratos fundacionales y contexto del dominio.
- `openspec/`: artifacts SDD/OpenSpec del roadmap y changes.

## Requisitos locales

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
copy .env.example .env
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

### Datos seed (demo)

Al ejecutar `python -m app.db.seed` se cargan datos base para pruebas:

- 20 categorías
- 30 ingredientes
- 40 productos
- usuarios con roles `ADMIN`, `STOCK`, `PEDIDOS`, `CLIENT` y combinaciones operativas

Usuarios seed relevantes:

- `admin@foodstore.local` → `ADMIN` (bootstrap)
- `admin2@foodstore.local` → `ADMIN`
- `stock@foodstore.local` → `STOCK`
- `pedidos@foodstore.local` → `PEDIDOS`
- `operador@foodstore.local` → `STOCK`, `PEDIDOS`
- `cliente1@foodstore.local` → `CLIENT`
- `cliente2@foodstore.local` → `CLIENT`
- `cliente3@foodstore.local` → `CLIENT`

Contraseña inicial de usuarios seed: valor de `BOOTSTRAP_ADMIN_PASSWORD` en `backend/.env`.

Variables nuevas de auth/RBAC relevantes en `backend/.env.example`:

- `PASSWORD_MIN_LENGTH`
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS`
- `AUTH_RATE_LIMIT_WINDOW_MINUTES`
- `BOOTSTRAP_ADMIN_FIRST_NAME`
- `BOOTSTRAP_ADMIN_LAST_NAME`

Backend URLs:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Healthcheck: `http://localhost:8000/api/v1/health`

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL:

- App: `http://localhost:5173`

## Verificaciones útiles

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm run typecheck
npm run test -- --run
```

## Contratos canónicos

La fundación deja fijados estos contratos:

- errores API RFC 7807 extendidos,
- paginación `page/size`,
- timestamps UTC ISO8601,
- dinero con `Decimal`/`NUMERIC`,
- catálogos con ID estable + `code` semántico.

Más detalle en `docs/foundation.md`.
