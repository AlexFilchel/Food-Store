## Why

Administración necesita visibilidad ejecutiva y operativa del negocio sin consultar pedidos, pagos y catálogo manualmente. Este change convierte los datos ya estabilizados de pedidos, pagos y productos en métricas confiables para tomar decisiones diarias.

## What Changes

- Agrega una capacidad de dashboard administrativo con métricas generales de ventas, pedidos, ticket promedio y productos destacados.
- Expone endpoints protegidos para consultar métricas agregadas por rango temporal, granularidad y zona horaria de negocio.
- Define fórmulas canónicas para ingresos, conteos de pedidos, ventas por período, pedidos por estado y top productos.
- Agrega una vista frontend administrativa con tarjetas KPI, gráficos/listados de ventas por período, top productos y distribución de pedidos por estado.
- Mantiene las métricas como lecturas derivadas: no cambia el lifecycle de pedidos, pagos, catálogo ni FSM.
- Excluye configuración global del sistema, reportes exportables, analítica avanzada y cambios en proveedores de pago.

## Capabilities

### New Capabilities
- `admin-dashboard-metrics`: Métricas administrativas derivadas de pedidos, pagos y catálogo, incluyendo KPIs generales, ventas por período, top productos y pedidos por estado con filtros temporales explícitos.

### Modified Capabilities
- Ninguna. El change consume capacidades existentes sin alterar sus contratos de negocio.

## Impact

- Backend: nuevos endpoints/servicios/repositorios de solo lectura para métricas administrativas, probablemente bajo el módulo de administración, reporting o pedidos según la arquitectura existente.
- Frontend: nueva pantalla protegida de dashboard administrativo y cliente API/tipos para consumir métricas.
- Seguridad: acceso restringido a roles administrativos autorizados; clientes no deben acceder a métricas globales.
- Datos: consultas agregadas sobre pedidos, items de pedido, pagos y productos existentes; requiere índices adecuados para filtros por fecha/estado si no existen.
- Contratos: las fórmulas, filtros temporales, zona horaria y criterios de inclusión/exclusión quedan documentados antes de implementar, como exige el roadmap.
