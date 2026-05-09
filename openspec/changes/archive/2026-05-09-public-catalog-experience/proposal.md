## Why

El catálogo administrativo ya permite gestionar productos, categorías e ingredientes, pero el cliente todavía no tiene una experiencia pública para descubrir productos antes de comprar. Este change abre el primer punto de valor visible del negocio y deja preparada la entrada natural al carrito.

## What Changes

- Agregar endpoints públicos de catálogo para listar productos y ver detalle sin autenticación.
- Exponer solo productos vendibles: no eliminados, activos, disponibles y con stock positivo.
- Soportar búsqueda, filtro por categoría y paginación canónica `page/size` con respuesta `items/total/page/size/pages`.
- Reutilizar el payload público de producto con categorías e ingredientes, sin campos internos de administración.
- Reemplazar la home placeholder por una experiencia pública de catálogo con listado, filtros básicos, estados de carga/error/vacío y navegación al detalle.
- Agregar pruebas backend y frontend del flujo público crítico.

## Capabilities

### New Capabilities
- `public-catalog-experience`: catálogo público navegable con listado, filtros, paginación, detalle y UI cliente.

### Modified Capabilities
- None.

## Impact

- Backend: `backend/app/modules/products/` agregará contrato público paralelo al router admin.
- Backend API: nuevos endpoints públicos bajo `/api/v1/catalog/products`.
- Frontend: `frontend/src/pages/home-page/`, nuevas piezas de catálogo público y cliente API público.
- Frontend data: query keys y cliente HTTP separados de administración para evitar mezclar permisos y filtros admin.
- Specs/tests: nuevo spec OPSX del capability y cobertura del listado/detalle público.
