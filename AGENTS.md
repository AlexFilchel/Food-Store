# AGENTS.md

Este archivo actúa como **router de skills del proyecto**.  
Usá **solo** las skills instaladas localmente en `.agents/skills/`.

## Regla general

- Antes de escribir código, revisar si la tarea coincide con alguna skill de esta lista.
- Si coinciden varias, cargar **todas las relevantes**.
- No asumir skills no instaladas.
- Si la tarea no coincide con ninguna skill, trabajar sin cargar skills adicionales.

## Router de skills instaladas

| Skill | Cuándo activarla |
| --- | --- |
| `architecture-patterns` | Cuando haya que diseñar o refactorizar arquitectura backend, aplicar Clean Architecture, Hexagonal Architecture, DDD, bounded contexts o resolver ciclos entre capas. |
| `fastapi-templates` | Cuando haya que crear o estructurar aplicaciones FastAPI, endpoints backend, patrones async, dependency injection o manejo de errores en APIs Python. |
| `find-skills` | Cuando el usuario pida buscar, descubrir o recomendar nuevas skills para una tecnología, flujo o necesidad específica. |
| `local-dev-autofix` | Cuando el frontend no conecta al backend en local (Windows): puerto 8000 ocupado, CORS 5173/5174, env vars; diagnóstico y reparación con confirmación antes de acciones destructivas. |
| `openapi-specification-v2` | Cuando haya que escribir, revisar, validar o interpretar especificaciones Swagger/OpenAPI 2.0. |
| `python-code-review` | Cuando haya que revisar código Python buscando type safety, async/await correcto, manejo de errores y errores comunes. |
| `python-expert-best-practices-code-review` | Cuando se escriba, revise o refactorice código Python productivo y se necesiten buenas prácticas generales de calidad. |
| `sqlalchemy-alembic-expert-best-practices-code-review` | Cuando se trabajen modelos SQLAlchemy, migraciones Alembic, cambios de schema o patrones de consulta a base de datos en Python. |
| `vercel-react-best-practices` | Cuando se escriba, revise o refactorice código React, especialmente performance, rendering, data fetching y optimización de bundle. |
| `typescript-advanced-types` | Cuando haya lógica de tipos compleja en TypeScript: generics, conditional types, mapped types, utility types o búsqueda de type safety avanzada. |
| `vite` | Cuando la tarea involucre configuración de Vite, `vite.config`, plugins, SSR, librerías o build tooling con Vite. |
| `tailwind-design-system` | Cuando haya que construir o estandarizar UI con Tailwind, design tokens, librerías de componentes o patrones responsive reutilizables. |
| `dashboard-crud-page` | Cuando haya que crear páginas CRUD en `Dashboard/src/pages/` con tabla, modal de formulario, confirmación de borrado, hooks estándar y patrones UI consistentes del dashboard. |
| `supabase-postgres-best-practices` | Cuando haya que diseñar schemas Postgres, optimizar queries, índices, locking, performance o configuraciones de base de datos. |
| `tanstack-query-best-practices` | Cuando se implemente o revise server state con TanStack Query: queries, mutations, invalidación, caching, prefetching o hydration. |

## Reglas de combinación

- **Backend API Python**: combinar `architecture-patterns` + `fastapi-templates` + `python-expert-best-practices-code-review`.
- **Persistencia Python**: combinar `sqlalchemy-alembic-expert-best-practices-code-review` + `supabase-postgres-best-practices`.
- **Frontend React**: combinar `vercel-react-best-practices` + `typescript-advanced-types`.
- **Frontend React con server state**: agregar `tanstack-query-best-practices`.
- **Frontend UI**: agregar `tailwind-design-system`.
- **Dashboard CRUD React**: combinar `vercel-react-best-practices` + `typescript-advanced-types` + `tailwind-design-system` + `dashboard-crud-page`.
- **Dashboard CRUD React con server state**: agregar `tanstack-query-best-practices`.
- **Tooling frontend**: agregar `vite`.
- **Diseño de arquitectura de módulos**: priorizar `architecture-patterns`.
- **Documentación de API en Swagger 2.0**: usar `openapi-specification-v2`.

## Restricción

No cargar ni recomendar skills fuera de esta lista salvo que el usuario pida explícitamente buscarlas, en cuyo caso se activa `find-skills`.
