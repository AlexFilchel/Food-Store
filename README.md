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

# Windows: copy .env.example .env
# Linux/Mac: cp .env.example .env
copy .env.example .env

alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

> ⚠️ Después de copiar `.env.example` a `.env`, completá las credenciales reales de Mercado Pago (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`) y ajustá `DATABASE_URL` con tu contraseña de PostgreSQL local.

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

# Windows: copy .env.example .env
# Linux/Mac: cp .env.example .env
copy .env.example .env

npm run dev
```

Frontend URL:

- App: `http://localhost:5173`

## Integración con Mercado Pago

El proyecto usa Mercado Pago como procesador de pagos. Para que funcione en local necesitás **ngrok**, porque MP necesita una URL pública HTTPS para:
- Enviar **webhooks** de notificación de pagos (`MP_NOTIFICATION_URL`)
- **Redirigir al usuario** después del pago (`back_urls` + `auto_return`)

### Requisitos

- [ngrok](https://ngrok.com) — creá una cuenta gratuita y configurá tu authtoken
- Un dominio ngrok asignado (ej: `tunombre.ngrok-free.dev`)

### 1. Configurar ngrok

```powershell
# Windows: ejecutá esto desde cualquier terminal (cmd o PowerShell)
# Reemplazá TU_DOMINIO por el que te asignó ngrok (ej: lobularly-unprosaical-nedra.ngrok-free.dev)
C:\Users\TU_USUARIO\AppData\Local\ngrok\ngrok.exe http --url=TU_DOMINIO.ngrok-free.dev 8000
```

> ⚠️ **La terminal de ngrok tiene que quedarse abierta** mientras trabajes. No la cerrés. Para frenarla: `Ctrl + C`.
>
> ❌ No uses el `ngrok` de npm (el wrapper `.ps1`). Siempre usá el `.exe` directo.
>
> 💡 En PowerShell podés crear un atajo con: `Set-Alias ng C:\Users\TU_USUARIO\AppData\Local\ngrok\ngrok.exe`
> Después solo escribís: `ng http --url=TU_DOMINIO.ngrok-free.dev 8000`

### 2. Variables de entorno

En `backend/.env` configurá estas 3 variables con TU dominio de ngrok:

```ini
# URL donde MP envía los webhooks de pago
MP_NOTIFICATION_URL=https://TU_DOMINIO.ngrok-free.dev/api/v1/payments/webhook

# URL del frontend para redirigir al usuario después del pago
# Debe ser HTTPS para que MP habilite auto_return (redirección automática)
MP_FRONTEND_URL=https://TU_DOMINIO.ngrok-free.dev

# CORS: agregá el dominio de ngrok para que el frontend pueda consultar la API
CORS_ORIGINS=["http://localhost:5173", "https://TU_DOMINIO.ngrok-free.dev"]
```

### 3. Cómo correr todo (3 terminales)

```powershell
# Terminal 1 — Backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev

# Terminal 3 — ngrok (con TU dominio, no el de otro)
C:\Users\TU_USUARIO\AppData\Local\ngrok\ngrok.exe http --url=TU_DOMINIO.ngrok-free.dev 8000
```

### Cómo probar

1. Andá a **`http://localhost:5173`**
2. Agregá productos al carrito y creá una orden
3. Iniciá el pago → vas al checkout de MP
4. Pagá con un **test user** de MP
5. ✅ MP te redirige automáticamente al frontend
6. ✅ El pedido aparece como **Confirmado**

> ⚠️ Los pagos creados **antes** de configurar ngrok correctamente no se van a actualizar. Creá una compra **nueva** desde el frontend.

### Compartir con un compañero

Cada desarrollador necesita **su propio dominio ngrok**. No pueden compartir el mismo dominio porque solo un túnel puede estar activo a la vez. Pasale las variables de `.env` pero con SU dominio.

---

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
