## Context

Food Store ya cuenta con pedidos, pagos MercadoPago, catálogo de productos y gestión operativa de pedidos como fuentes de datos estabilizadas. El roadmap ubica `admin-dashboard-metrics` después de `operations-order-management` porque las métricas dependen de datos reales y consistentes de catálogo, pedidos y pagos.

El dashboard debe ser una lectura administrativa derivada: no debe modificar pedidos, pagos, stock, productos ni auditoría. El punto delicado no es pintar gráficos; es definir fórmulas, filtros temporales y zona horaria ANTES de implementar. Si eso queda flojo, las métricas mienten. Y una métrica que miente es peor que no tener métrica, hermano.

Fuentes conceptuales:

```text
orders ───────────────┐
order_items ──────────┼──▶ metrics read models ──▶ admin dashboard API ──▶ dashboard UI
payments ─────────────┤
products/categories ──┘
```

## Goals / Non-Goals

**Goals:**

- Exponer métricas administrativas protegidas para roles autorizados.
- Calcular KPIs generales: ingresos confirmados, cantidad de pedidos, ticket promedio y pedidos pendientes/operativos.
- Calcular ventas por período con granularidad `day`, `week` y `month`.
- Calcular top productos por unidades vendidas e ingresos derivados de snapshots de `order_items`.
- Calcular distribución de pedidos por estado FSM.
- Documentar fórmulas, criterios de inclusión, filtros temporales y zona horaria.
- Renderizar una vista frontend administrativa con estados de carga, vacío y error.

**Non-Goals:**

- No se agregan nuevos estados de pedido ni transiciones FSM.
- No se modifica la integración MercadoPago ni el lifecycle de pagos.
- No se implementan exports CSV/PDF ni reportes programados.
- No se implementa analítica avanzada, cohortes, predicciones ni BI externo.
- No se implementa configuración global editable; eso pertenece a `system-configuration`.
- No se recalculan snapshots históricos desde el catálogo actual.

## Decisions

### 1. Métricas como endpoints de lectura agregada, no tablas materializadas iniciales

Se implementarán consultas agregadas sobre los datos existentes mediante servicios/repositorios de solo lectura.

**Rationale:** el volumen esperado del proyecto permite comenzar simple y verificable. Materializar métricas antes de medir carga real agrega sincronización, invalidación e inconsistencias.

**Alternatives considered:**

- **Tabla materializada/cache de métricas:** mejora performance futura, pero introduce invalidación y jobs. Se descarta para este change inicial.
- **Cálculo completo en frontend:** descartado; filtraría datos globales sensibles y duplicaría reglas.

### 2. Backend como fuente única de fórmulas

El frontend solo muestra payloads ya calculados; no recalcula ingresos, ticket promedio ni distribución.

**Rationale:** las fórmulas de negocio deben estar versionadas y testeables en backend. El frontend no tiene por qué conocer criterios contables.

### 3. Ingresos basados en pedidos confirmados/operativos con pago aprobado

La métrica de ingresos incluirá órdenes con pago aprobado y estado de pedido no terminal negativo. Para evitar inflar ventas, órdenes `CANCELADO` se excluyen aunque hayan tenido señales de pago históricas. Órdenes `ENTREGADO`, `EN_CAMINO`, `EN_PREPARACION` y `CONFIRMADO` con pago aprobado cuentan como venta. Órdenes `PENDIENTE` no cuentan como ingreso.

```text
Cuenta como ingreso:
  payment.status = APPROVED
  order.state IN (CONFIRMADO, EN_PREPARACION, EN_CAMINO, ENTREGADO)

No cuenta como ingreso:
  PENDIENTE, CANCELADO, pagos rechazados/pendientes/cancelados/expirados
```

**Rationale:** el pago aprobado confirma intención económica; el estado cancelado invalida la venta operacional para métricas ejecutivas.

**Trade-off:** si el negocio luego soporta reembolsos parciales, la fórmula deberá evolucionar. Eso queda fuera de alcance.

### 4. Usar snapshots de pedido para dinero y producto vendido

Ingresos y top productos se calculan desde snapshots de `order_items` (`unit_price`, cantidad, nombre/slug snapshot) y no desde el precio actual del producto.

**Rationale:** los productos pueden cambiar de precio/nombre. Las métricas históricas deben reflejar lo vendido, no el catálogo actual.

### 5. Filtros temporales explícitos con UTC persistido y zona horaria de negocio para agrupación

La API aceptará `from`, `to`, `granularity` y `timezone`. Persistencia sigue en UTC; los buckets de período se calculan según la zona horaria solicitada o default de negocio `America/Argentina/Buenos_Aires`.

```text
request range (timezone business) ──convert──▶ UTC boundaries for DB filter
                                      │
                                      └──▶ local bucket labels for UI
```

**Rationale:** el roadmap exige cerrar zona horaria. Agrupar por día en UTC rompería reportes diarios locales cerca de medianoche.

**Default:** `America/Argentina/Buenos_Aires` hasta que `system-configuration` haga editable esta decisión.

### 6. Contrato compacto para dashboard inicial

Se prefiere un endpoint resumen que devuelva todo lo necesario para la pantalla inicial y opcionalmente endpoints específicos si el código existente favorece separación.

Contrato conceptual:

```text
GET /admin/dashboard/metrics?from&to&granularity&timezone
  ├─ summary
  ├─ sales_by_period[]
  ├─ orders_by_state[]
  └─ top_products[]
```

**Rationale:** reduce waterfalls en frontend y mantiene una carga coherente para un dashboard. Si algún gráfico crece, se puede separar sin cambiar fórmulas.

### 7. Acceso restringido a administración

Solo roles administrativos autorizados pueden consultar métricas globales. Mínimo `ADMIN`; si el modelo actual ya habilita `PEDIDOS` para operación, el acceso a métricas debe definirse como `ADMIN` por defecto y ampliarse solo si existe una razón operacional explícita.

**Rationale:** métricas globales de ventas son datos sensibles. Ver pedidos operativos no implica automáticamente ver performance del negocio.

### 8. UI administrativa con estados visibles y sin mutaciones

La pantalla frontend debe vivir dentro del shell administrativo protegido. Debe mostrar loading, empty y error states; filtros temporales; cards KPI; visualizaciones simples o tablas para ventas por período, top productos y pedidos por estado.

**Rationale:** el dashboard es lectura ejecutiva, no una página CRUD. No debe introducir formularios de mutación ni acciones operativas.

## Risks / Trade-offs

- **Métricas inconsistentes por criterios ambiguos** → Mitigar con fórmulas normativas en spec y tests de casos límite (`PENDIENTE`, `CANCELADO`, pago rechazado, producto renombrado).
- **Queries pesadas por agregaciones globales** → Mitigar con filtros temporales obligatorios/default acotado, paginación/límite en top productos e índices sobre fecha/estado/payment status si faltan.
- **Día local mal agrupado por UTC** → Mitigar convirtiendo rangos y buckets con timezone explícita.
- **Exposición de datos sensibles** → Mitigar con RBAC backend; el frontend no es barrera de seguridad.
- **Top productos incorrecto por usar catálogo actual** → Mitigar usando snapshots de items de pedido para nombre/precio histórico.
- **Necesidad futura de refunds o revenue neto** → Mitigar dejando claro que esta versión calcula ventas aprobadas brutas sin reembolsos.

## Migration Plan

1. Agregar contratos/schemas de métricas sin modificar tablas de dominio existentes.
2. Implementar repositorios agregados de solo lectura sobre pedidos, items y pagos.
3. Agregar endpoints protegidos y tests de permisos/fórmulas.
4. Agregar cliente frontend y pantalla administrativa protegida.
5. Validar con datos seed o fixtures que cubran estados y pagos.

Rollback:

- Remover rutas/endpoints de métricas, cliente frontend y página de dashboard.
- No hay migración destructiva esperada; si se agregan índices, pueden mantenerse porque no alteran comportamiento.

## Open Questions

- ¿`PEDIDOS` debe poder ver métricas o solo `ADMIN`? Decisión propuesta: solo `ADMIN` para el primer corte.
- ¿El rango default debe ser últimos 7 días, últimos 30 días o mes actual? Decisión propuesta: últimos 30 días por utilidad inicial.
- ¿Ingresos deben agruparse por `paid_at`, `order.created_at` o `confirmed_at`? Decisión propuesta: `paid_at`/fecha de aprobación de pago cuando exista; fallback controlado a timestamp de transición a `CONFIRMADO` solo si el modelo no persiste `paid_at`.
