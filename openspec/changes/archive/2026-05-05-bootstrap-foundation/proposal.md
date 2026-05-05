## Why

Food Store necesita una fundación técnica real antes de implementar autenticación, catálogo, checkout, pagos o administración. Hoy el proyecto tiene documentación funcional avanzada, pero el repositorio todavía no cuenta con backend, frontend, migraciones, contratos transversales ni estructura ejecutable; sin este cambio, cualquier feature posterior arrancaría sobre arena.

## What Changes

- Crear el monorepo ejecutable con separación `backend/` y `frontend/`.
- Inicializar backend FastAPI con estructura feature-first, configuración centralizada, healthcheck, manejo de errores estándar, CORS, logging y patrón base `Router -> Service -> UnitOfWork -> Repository -> Model`.
- Inicializar persistencia PostgreSQL con SQLModel/SQLAlchemy Async, Alembic, modelos fundacionales, migración inicial y seed idempotente para catálogos obligatorios.
- Inicializar frontend React + TypeScript + Vite con Feature-Sliced Design, Tailwind, cliente HTTP base, TanStack Query, Zustand por responsabilidad y manejo global de errores.
- Cerrar contratos canónicos compartidos: errores API, paginación, identificadores de catálogos, dinero, fechas, naming y variables de entorno.
- Agregar documentación mínima de setup local para backend, frontend, base de datos, migraciones y seed.
- Agregar tests mínimos de arranque, configuración, contratos transversales y seed idempotente.

## Capabilities

### New Capabilities

- `project-foundation`: estructura del monorepo, configuración de entorno, documentación mínima y reglas de seguridad del repositorio.
- `backend-foundation`: aplicación FastAPI base, capas backend, configuración, errores, logging, healthcheck y wiring de dependencias.
- `data-foundation`: base PostgreSQL, SQLModel/SQLAlchemy Async, Alembic, modelos fundacionales y seed idempotente.
- `frontend-foundation`: aplicación React/Vite/TypeScript base con FSD, Tailwind, cliente HTTP, TanStack Query y Zustand.
- `api-contracts`: contratos transversales para errores, paginación, dinero, fechas, naming e identificadores compartidos.

### Modified Capabilities

- Ninguna. No existen specs activas previas en `openspec/specs/`.

## Impact

- Afecta la raíz del repositorio, `backend/`, `frontend/`, configuración de entornos y documentación de setup.
- Introduce dependencias backend: FastAPI, SQLModel, SQLAlchemy Async, Alembic, asyncpg, pydantic-settings, passlib/bcrypt, python-jose, slowapi, structlog, pytest/httpx cuando aplique.
- Introduce dependencias frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, Axios, Zustand, React Router y tooling de lint/typecheck/test cuando aplique.
- Crea la base para los changes posteriores `auth-rbac-core`, `frontend-shell-access-control`, `category-management`, `ingredient-management` y todos los módulos de negocio.
- No implementa casos de uso completos de autenticación, catálogo, carrito, pedidos, pagos ni administración; solo deja la plataforma lista para construirlos de forma consistente.
