## Context

El roadmap define `public-catalog-experience` como change 7, después de `product-catalog-management` y `frontend-shell-access-control`. Hoy existe CRUD administrativo de productos bajo `/api/v1/admin/products`, con filtros, paginación canónica y composición de categorías/ingredientes. La home pública todavía renderiza un overview fundacional, no un catálogo real.

## Goals / Non-Goals

**Goals:**
- Exponer catálogo público sin autenticación, separado del contrato admin.
- Mostrar solo productos vendibles: `deleted_at IS NULL`, `is_active=true`, `is_available=true`, `stock_quantity > 0`.
- Reutilizar el contrato canónico de paginación y errores.
- Reutilizar composición de producto para preparar carrito/personalización futura.
- Implementar UI pública de listado, filtros básicos, detalle y estados de carga/error/vacío.

**Non-Goals:**
- No implementar carrito, checkout, favoritos ni perfil cliente.
- No modificar reglas administrativas de productos.
- No agregar reserva de stock ni lógica transaccional de pedidos.
- No permitir filtros internos admin como `include_inactive`, `ingredient_id` o edición desde UI pública.

## Decisions

1. **Router público separado de router admin**
   - Decisión: agregar endpoints bajo `/api/v1/catalog/products` sin dependencia `require_role`.
   - Alternativa: reutilizar `/admin/products` con permisos condicionales. Se descarta porque mezcla contratos y aumenta riesgo de exponer flags administrativos.

2. **Payload público explícito**
   - Decisión: crear schemas públicos, aunque inicialmente compartan campos seguros con `ProductResponse`.
   - Alternativa: devolver `ProductResponse` directo. Es más rápido, pero acopla frontend público a campos admin como `is_active` y `stock_quantity` que no necesariamente deben ser UX pública estable.

3. **Filtros públicos mínimos**
   - Decisión: soportar `search`, `category_id`, `page` y `size`; el backend fuerza vendibilidad.
   - Alternativa: exponer todos los filtros admin. Se descarta porque el público no debe descubrir productos inactivos/no disponibles ni depender de semántica operativa.

4. **Frontend con cliente/query keys públicos**
   - Decisión: crear API client y query keys separados del feature admin.
   - Alternativa: reutilizar `productClient`. Se descarta porque apunta a rutas admin y arrastra permisos/filtros no públicos.

5. **Home pública como entrada de catálogo**
   - Decisión: reemplazar la home placeholder por el listado público y navegar a detalle.
   - Alternativa: crear una ruta secundaria y dejar home igual. Se descarta porque el catálogo es el principal entrypoint del cliente según roadmap.

## Risks / Trade-offs

- **Riesgo: N+1 al convertir productos con categorías/ingredientes** → Mitigar manteniendo alcance inicial paginado y, si aparece degradación, optimizar repositorio con eager loading/selects agregados.
- **Riesgo: exposición accidental de datos admin** → Mitigar con schemas públicos dedicados y tests que validen ausencia de campos internos.
- **Riesgo: confusión entre disponibilidad y stock** → Mitigar con filtro backend obligatorio: público solo ve productos activos, disponibles y con stock mayor a cero.
- **Trade-off: sin productos agotados visibles** → Reduce complejidad UX inicial; si negocio quiere mostrar agotados, debe ser otro cambio explícito.

## Migration Plan

1. Agregar endpoints públicos y tests backend sin romper endpoints admin existentes.
2. Agregar cliente frontend público y vistas públicas.
3. Reemplazar contenido de `/` por catálogo público.
4. Rollback: remover rutas públicas nuevas y restaurar `HomePage` al overview anterior; no requiere migraciones de base de datos.

## Open Questions

- ¿El detalle público debe usar `id` o `slug` en la URL? Diseño recomendado: usar `slug` para UX, con fallback interno por id solo si el modelo actual no soporta lookup público por slug sin demasiado cambio.
- ¿El precio público debe mostrarse siempre aunque el producto quede sin stock entre requests? Este change fuerza stock positivo en list/detail; carrito/checkout revalidará después.
