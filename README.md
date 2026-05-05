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
