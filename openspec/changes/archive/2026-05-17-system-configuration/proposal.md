## Why

Food Store ya tiene los módulos operativos principales estabilizados, pero algunas reglas de operación siguen rígidas en código o constantes: zona horaria de negocio, ventanas operativas, parámetros de pedidos y catálogos administrables de soporte. Este change expone una configuración global acotada para que administración ajuste parámetros realmente operables sin convertir la configuración en una tabla genérica que esconda decisiones de diseño.

## What Changes

- Agrega una capacidad administrativa de configuración del sistema accesible solo para usuarios con rol `ADMIN`.
- Introduce almacenamiento persistente y auditable de parámetros operativos versionados, tipados y validados.
- Expone endpoints para consultar configuración efectiva y actualizar únicamente claves permitidas.
- Agrega UI administrativa read/write para visualizar y editar parámetros globales con feedback de validación.
- Define un catálogo inicial de parámetros configurables limitado a reglas operativas reales:
  - zona horaria de negocio usada por métricas y reportes operativos,
  - mínimos/máximos operativos de pedidos cuando apliquen,
  - switches operativos seguros para habilitar/deshabilitar capacidades no destructivas,
  - datos públicos del negocio usados por la experiencia de cliente cuando no sean secretos.
- Mantiene fuera de alcance secretos, credenciales, configuración de infraestructura, flags experimentales arbitrarios y cambios que deberían ser migraciones o decisiones de arquitectura.
- Registra auditoría de cambios de configuración: quién cambió qué, valor anterior, valor nuevo y timestamp.

## Capabilities

### New Capabilities
- `system-configuration`: Administración de parámetros globales tipados, validados, auditables y consumibles por backend/frontend.

### Modified Capabilities
- None.

## Impact

- **Backend**: nuevo módulo administrativo de configuración, modelos/tablas de configuración y auditoría, repositorio, servicio, schemas y router protegido por RBAC `ADMIN`.
- **Frontend**: nueva página dentro del shell administrativo para consultar/editar configuración, hooks de server state, formularios tipados y manejo de errores de validación.
- **Database**: migraciones para tabla de claves configurables, valores efectivos y log append-only de auditoría.
- **APIs**: endpoints administrativos para lectura/actualización y endpoint de lectura segura de configuración pública si la UI cliente lo necesita.
- **Operación**: la configuración efectiva debe tener defaults seguros en código/seed para que el sistema arranque aunque todavía no existan overrides en base de datos.
- **Seguridad**: no se exponen ni almacenan secretos; solo claves whitelisted y validadas por tipo/rango.