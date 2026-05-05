# Mapa de Changes — Food Store

## Enfoque

Este roadmap organiza Food Store en changes **incrementales, verticales y desacoplados**, priorizando primero las capacidades fundacionales y luego las funcionalidades de negocio de mayor complejidad.

Criterios aplicados:

- construir primero la **base técnica y arquitectónica**,
- habilitar después los **módulos núcleo del dominio**,
- separar los cambios con alta complejidad transaccional o de integración,
- evitar changes demasiado grandes o con dependencias circulares,
- mantener una secuencia que permita entregar valor real de forma progresiva,
- cerrar contratos transversales antes de que sean consumidos por varios módulos,
- exigir que cada change deje una porción vertical verificable, no solo estructura,
- proteger trazabilidad, seguridad, idempotencia y testabilidad desde la fundación.

---


## Secuencia recomendada de implementación

1. `bootstrap-foundation`
2. `auth-rbac-core`
3. `frontend-shell-access-control`
4. `category-management`
5. `ingredient-management`
6. `product-catalog-management`
7. `public-catalog-experience`
8. `customer-profile`
9. `delivery-addresses`
10. `shopping-cart`
11. `checkout-preflight-validation`
12. `order-creation-core`
13. `mercadopago-payment-flow`
14. `order-fsm-and-audit-trail`
15. `customer-order-tracking`
16. `operations-order-management`
17. `user-administration`
18. `admin-dashboard-metrics`
19. `system-configuration`

---

## Guardrails transversales de ejecución

Estos guardrails no agregan nuevos changes al roadmap: son condiciones de calidad que cada change debe respetar para que el proyecto no acumule deuda invisible.

### Definition of Done mínima por change

Cada change se considera completo solamente si cumple estos puntos:

- **Specs OPSX actualizadas**: proposal, design, specs y tasks reflejan lo realmente implementado.
- **Contrato visible**: endpoints, schemas, errores, permisos y eventos relevantes quedan documentados en el propio change.
- **Vertical slice verificable**: el change deja al menos un flujo demostrable extremo a extremo cuando aplique.
- **Tests del alcance crítico**: reglas de negocio, ownership, permisos, transacciones e idempotencia tienen cobertura mínima.
- **Migraciones y seeds seguros**: toda migración es reversible cuando sea razonable y todo seed es idempotente.
- **Sin secretos ni estado local accidental**: `.env`, tokens, dumps, credenciales y archivos generados quedan fuera del repo.
- **Observabilidad básica**: errores relevantes tienen `code` estable y logs suficientes para diagnóstico sin exponer datos sensibles.

### Contratos canónicos a cerrar en `bootstrap-foundation`

Antes de aplicar changes consumidores, `bootstrap-foundation` debe dejar fijadas estas decisiones para evitar inconsistencias entre backend, frontend y specs:

| Tema | Decisión que debe quedar cerrada | Por qué importa |
| --- | --- | --- |
| Identificadores de catálogos | Definir si roles, estados y formas de pago se referencian por `code` semántico, ID numérico estable o ambos con una regla clara. | Evita joins, seeds y permisos contradictorios. |
| Errores API | Adoptar un único formato RFC 7807 extendido con `code`, `timestamp` y `errors[]` para validaciones. | Permite manejo uniforme en frontend y tests. |
| Paginación | Elegir un solo contrato (`page/size` o `skip/limit`) y usarlo en todos los listados. | Evita adaptadores innecesarios y bugs de UI. |
| Refresh tokens | Definir almacenamiento como hash, rotación y respuesta ante replay attack. | Es una frontera de seguridad central. |
| Fechas y zona horaria | Usar timestamps timezone-aware persistidos en UTC y formateo en frontend. | Evita errores en auditoría, pedidos y métricas. |
| Dinero | Usar `NUMERIC/Decimal`, nunca `float`, y definir redondeo en servicios. | Evita errores contables y diferencias entre pago y pedido. |
| Naming API | Estándar único para rutas, campos JSON y códigos de catálogo. | Reduce fricción frontend/backend. |

### Orden de validación recomendado

```text
Spec del change
   │
   ▼
Design con decisiones explícitas
   │
   ▼
Tasks pequeñas y verificables
   │
   ▼
Implementación vertical
   │
   ▼
Tests + revisión de contratos
   │
   ▼
Archive con specs sincronizadas
```

---

## Tabla resumen de changes

| Orden | Change | Descripción / funcionalidad que introduce | Historias de usuario que implementa | Depende de | Justificación de dependencia |
| --- | --- | --- | --- | --- | --- |
| 1 | `bootstrap-foundation` | Crea la base técnica del proyecto: monorepo, setup de backend/frontend, configuración de PostgreSQL, migraciones, seed data, patrones base, manejo de errores, validación de inputs y estructura arquitectónica inicial. | US-000, US-000a, US-000b, US-000c, US-000d, US-000e, US-068, US-074 | — | Es la base técnica del proyecto; sin este change no existe entorno ejecutable ni arquitectura consistente. |
| 2 | `auth-rbac-core` | Implementa registro, login, refresh, logout, `/auth/me`, JWT, RBAC, ownership básico y rate limiting de autenticación. | US-001, US-002, US-003, US-004, US-005, US-006, US-073 | `bootstrap-foundation` | Necesita base de datos, seed de roles/estados, configuración JWT, middleware y patrones base ya resueltos. |
| 3 | `frontend-shell-access-control` | Construye el shell inicial del frontend: layout base, navegación, rutas públicas/privadas, guards, expiración de token y manejo global de errores HTTP. | US-075, US-076, US-066, US-067 | `bootstrap-foundation`, `auth-rbac-core` | Depende de stores, router, interceptores y autenticación real para proteger rutas y construir navegación por rol. |
| 4 | `category-management` | Implementa CRUD de categorías jerárquicas con soft delete, validación de ciclos y restricciones de borrado. | US-007, US-008, US-009, US-010 | `bootstrap-foundation`, `auth-rbac-core` | Necesita persistencia, repositorios/UoW y permisos por rol para operaciones administrativas. |
| 5 | `ingredient-management` | Implementa CRUD de ingredientes y alérgenos con soft delete. | US-011, US-012, US-013, US-014 | `bootstrap-foundation`, `auth-rbac-core` | Comparte la misma infraestructura, permisos y patrones que el catálogo administrativo. |
| 6 | `product-catalog-management` | Implementa alta, edición, baja lógica, stock, disponibilidad y asociaciones de productos con categorías e ingredientes. | US-015, US-016, US-017, US-020, US-021, US-022, US-023, US-064 | `category-management`, `ingredient-management`, `auth-rbac-core` | Un producto depende estructuralmente de categorías, ingredientes, reglas de stock y permisos administrativos. |
| 7 | `public-catalog-experience` | Expone el catálogo al cliente con listado público, filtros, paginación y detalle de producto. | US-018, US-019 | `product-catalog-management`, `frontend-shell-access-control` | Primero deben existir productos consistentes y la base visual del frontend para renderizar el catálogo. |
| 8 | `customer-profile` | Permite al cliente ver y editar su perfil, además de cambiar su contraseña. | US-061, US-062, US-063 | `auth-rbac-core`, `frontend-shell-access-control` | Requiere sesión autenticada, control de ownership y una UI protegida. |
| 9 | `delivery-addresses` | Implementa CRUD de direcciones de entrega y manejo de dirección predeterminada. | US-024, US-025, US-026, US-027, US-028 | `auth-rbac-core`, `frontend-shell-access-control`, `customer-profile` | Depende de identidad del cliente y es insumo directo del pedido. |
| 10 | `shopping-cart` | Implementa carrito client-side persistente con agregar, quitar, modificar cantidades, vaciar y personalizar productos quitando ingredientes válidos. | US-029, US-030, US-031, US-032, US-033, US-034 | `public-catalog-experience`, `product-catalog-management`, `frontend-shell-access-control` | Necesita catálogo navegable, productos con ingredientes asociados y shell frontend estable. |
| 11 | `checkout-preflight-validation` | Valida stock, disponibilidad, precios vigentes y consistencia del carrito antes de crear el pedido. | US-069, US-070 | `shopping-cart`, `product-catalog-management`, `delivery-addresses` | Necesita carrito real, catálogo consistente y dirección de entrega elegible. |
| 12 | `order-creation-core` | Crea pedidos de forma atómica desde el carrito, con snapshots de precio, nombre y dirección, total calculado y registro inicial de historial. | US-035, US-036, US-037, US-038 | `checkout-preflight-validation`, `delivery-addresses`, `auth-rbac-core` | Requiere validaciones previas, ownership del cliente y soporte UoW. |
| 13 | `mercadopago-payment-flow` | Integra el flujo de pagos con MercadoPago: creación de pago, consulta de estado, reintento e idempotencia. | US-045, US-047, US-048 | `order-creation-core`, `frontend-shell-access-control` | No se puede iniciar un pago sin un pedido existente y una UI de checkout funcional. |
| 14 | `order-fsm-and-audit-trail` | Implementa la máquina de estados del pedido, cancelaciones, historial append-only, transición automática por pago aprobado y restauración/decremento de stock. | US-039, US-040, US-041, US-042, US-043, US-044, US-046 | `order-creation-core`, `mercadopago-payment-flow`, `auth-rbac-core` | Necesita pedidos existentes, pagos reales y permisos por rol para ejecutar transiciones válidas. |
| 15 | `customer-order-tracking` | Permite al cliente ver sus pedidos, su detalle, confirmación de creación y feedback del estado de pago. | US-049, US-050, US-071, US-072 | `order-creation-core`, `mercadopago-payment-flow`, `order-fsm-and-audit-trail`, `frontend-shell-access-control` | Requiere pedidos creados, pagos registrados, estados consistentes y UI autenticada. |
| 16 | `operations-order-management` | Implementa la vista operativa de pedidos para admin/gestor, incluyendo visualización global y soporte a la gestión diaria. | US-051, US-052, US-065 | `order-fsm-and-audit-trail`, `frontend-shell-access-control`, `auth-rbac-core` | Necesita trazabilidad, permisos por rol y panel protegido para operar. |
| 17 | `user-administration` | Permite listar, editar, desactivar usuarios y asignar roles desde administración. | US-053, US-054, US-055 | `auth-rbac-core`, `frontend-shell-access-control` | Requiere RBAC firme y UI administrativa protegida. |
| 18 | `admin-dashboard-metrics` | Implementa dashboard administrativo con métricas generales, ventas por período, top productos y pedidos por estado. | US-056, US-057, US-058, US-059 | `operations-order-management`, `mercadopago-payment-flow`, `product-catalog-management` | Depende de datos reales y consistentes de catálogo, pedidos y pagos. |
| 19 | `system-configuration` | Expone la configuración global del sistema para parámetros operativos y catálogos administrables. | US-060 | `auth-rbac-core`, `operations-order-management`, `admin-dashboard-metrics` | Conviene implementarlo al final, cuando ya están claros los parámetros realmente necesarios y el dominio está estabilizado. |

---

# Detalle de Changes

## 1) `bootstrap-foundation`

**Descripción**  
Crea la base técnica del proyecto: monorepo, setup de backend/frontend, configuración de PostgreSQL, migraciones, seed data, patrones base, manejo de errores, validación de inputs y estructura arquitectónica inicial.

**Problema que resuelve**  
Sin este change no existe entorno ejecutable, arquitectura compartida ni base consistente para construir el sistema.

**Habilita**  
Todo el desarrollo posterior del sistema.

**Historias de usuario**
- US-000
- US-000a
- US-000b
- US-000c
- US-000d
- US-000e
- US-068
- US-074

**Depends on**  
- Ninguno

**Justificación de dependencias**  
- Es la base técnica inicial.

---

## 2) `auth-rbac-core`

**Descripción**  
Implementa registro, login, refresh, logout, `/auth/me`, protección JWT, RBAC, ownership básico y rate limiting de autenticación.

**Problema que resuelve**  
El sistema necesita identidad, sesiones y permisos antes de exponer funcionalidades protegidas o flujos por rol.

**Habilita**  
Acceso seguro por roles para clientes, admin, stock y pedidos.

**Historias de usuario**
- US-001
- US-002
- US-003
- US-004
- US-005
- US-006
- US-073

**Depends on**
- `bootstrap-foundation`

**Justificación de dependencias**  
- Requiere base de datos, seed de roles/estados, configuración JWT, middleware y patrones base ya resueltos.

---

## 3) `frontend-shell-access-control`

**Descripción**  
Construye el shell inicial del frontend: layout base, navegación, rutas públicas/privadas, guards, manejo de expiración de token y manejo global de errores HTTP.

**Problema que resuelve**  
Sin un shell coherente, el frontend no puede sostener una experiencia autenticada consistente ni separar vistas por rol.

**Habilita**  
El crecimiento ordenado del frontend para cliente y panel administrativo.

**Historias de usuario**
- US-075
- US-076
- US-066
- US-067

**Depends on**
- `bootstrap-foundation`
- `auth-rbac-core`

**Justificación de dependencias**  
- Depende de stores, router, interceptores y autenticación real para proteger rutas y construir navegación contextual.

---

## 4) `category-management`

**Descripción**  
Implementa CRUD de categorías jerárquicas con soft delete, validación de ciclos y restricciones de borrado.

**Problema que resuelve**  
El catálogo necesita una taxonomía consistente para clasificar productos y soportar navegación y filtrado posteriores.

**Habilita**  
Relaciones producto-categoría y estructura navegable del catálogo.

**Historias de usuario**
- US-007
- US-008
- US-009
- US-010

**Depends on**
- `bootstrap-foundation`
- `auth-rbac-core`

**Justificación de dependencias**  
- Necesita persistencia, repositorios/UoW y permisos por rol para operaciones administrativas.

---

## 5) `ingredient-management`

**Descripción**  
Implementa CRUD de ingredientes y alérgenos con soft delete.

**Problema que resuelve**  
Los productos requieren composición detallada para informar al cliente, soportar restricciones alimentarias y habilitar personalización.

**Habilita**  
Asociación de ingredientes a productos y filtrado por alérgenos.

**Historias de usuario**
- US-011
- US-012
- US-013
- US-014

**Depends on**
- `bootstrap-foundation`
- `auth-rbac-core`

**Justificación de dependencias**  
- Comparte la misma infraestructura, permisos y patrones que el catálogo administrativo.

---

## 6) `product-catalog-management`

**Descripción**  
Implementa alta, edición, baja lógica, stock, disponibilidad y asociaciones de productos con categorías e ingredientes.

**Problema que resuelve**  
El negocio necesita gestionar el catálogo real de venta con stock y composición del producto.

**Habilita**  
Catálogo público, carrito, checkout y operación de stock.

**Historias de usuario**
- US-015
- US-016
- US-017
- US-020
- US-021
- US-022
- US-023
- US-064

**Depends on**
- `category-management`
- `ingredient-management`
- `auth-rbac-core`

**Justificación de dependencias**  
- Un producto depende estructuralmente de categorías, ingredientes, reglas de stock y permisos administrativos.

---

## 7) `public-catalog-experience`

**Descripción**  
Expone el catálogo al cliente con listado público, filtros, paginación y detalle de producto.

**Problema que resuelve**  
Sin experiencia pública de catálogo no existe entrada de valor para el cliente ni base para iniciar compras.

**Habilita**  
Exploración, selección de productos y entrada al carrito.

**Historias de usuario**
- US-018
- US-019

**Depends on**
- `product-catalog-management`
- `frontend-shell-access-control`

**Justificación de dependencias**  
- Primero deben existir productos consistentes y la base visual del frontend para renderizar el catálogo.

---

## 8) `customer-profile`

**Descripción**  
Permite al cliente ver y editar su perfil, además de cambiar su contraseña.

**Problema que resuelve**  
El usuario autenticado necesita autogestión de sus datos personales y credenciales.

**Habilita**  
Cuenta de cliente más completa y ownership explícito.

**Historias de usuario**
- US-061
- US-062
- US-063

**Depends on**
- `auth-rbac-core`
- `frontend-shell-access-control`

**Justificación de dependencias**  
- Requiere sesión autenticada, control de ownership y una UI protegida.

---

## 9) `delivery-addresses`

**Descripción**  
Implementa CRUD de direcciones de entrega y manejo de dirección predeterminada.

**Problema que resuelve**  
El pedido necesita una dirección válida, administrable por el cliente y con ownership estricto.

**Habilita**  
Checkout y creación de pedidos con entrega.

**Historias de usuario**
- US-024
- US-025
- US-026
- US-027
- US-028

**Depends on**
- `auth-rbac-core`
- `frontend-shell-access-control`
- `customer-profile`

**Justificación de dependencias**  
- Depende de identidad del cliente y es insumo directo del pedido.

---

## 10) `shopping-cart`

**Descripción**  
Implementa carrito client-side persistente con agregar, quitar, modificar cantidades, vaciar y personalizar productos quitando ingredientes válidos.

**Problema que resuelve**  
El cliente necesita una unidad de trabajo previa al checkout que preserve intención de compra.

**Habilita**  
Pre-checkout y conversión de selección de productos en pedido.

**Historias de usuario**
- US-029
- US-030
- US-031
- US-032
- US-033
- US-034

**Depends on**
- `public-catalog-experience`
- `product-catalog-management`
- `frontend-shell-access-control`

**Justificación de dependencias**  
- Necesita catálogo navegable, productos con ingredientes asociados y shell frontend estable.

---

## 11) `checkout-preflight-validation`

**Descripción**  
Valida stock, disponibilidad, precios vigentes y consistencia del carrito antes de crear el pedido.

**Problema que resuelve**  
Evita crear pedidos inválidos, inconsistentes o desactualizados respecto del catálogo real.

**Habilita**  
Creación confiable y transaccional del pedido.

**Historias de usuario**
- US-069
- US-070

**Depends on**
- `shopping-cart`
- `product-catalog-management`
- `delivery-addresses`

**Justificación de dependencias**  
- Necesita carrito real, catálogo consistente y dirección de entrega elegible.

---

## 12) `order-creation-core`

**Descripción**  
Crea pedidos de forma atómica desde el carrito, con snapshots de precio, nombre y dirección, total calculado y registro inicial de historial.

**Problema que resuelve**  
El sistema necesita persistir órdenes de compra con integridad histórica y transaccional.

**Habilita**  
Pago, FSM del pedido y seguimiento.

**Historias de usuario**
- US-035
- US-036
- US-037
- US-038

**Depends on**
- `checkout-preflight-validation`
- `delivery-addresses`
- `auth-rbac-core`

**Justificación de dependencias**  
- Requiere validaciones previas, ownership del cliente y soporte UoW.

---

## 13) `mercadopago-payment-flow`

**Descripción**  
Integra el flujo de pagos con MercadoPago: creación de pago, consulta de estado, reintento e idempotencia.

**Problema que resuelve**  
El pedido necesita un mecanismo real de cobro seguro y compatible con el dominio del negocio.

**Habilita**  
Confirmación de pedidos por pago y múltiples intentos de pago.

**Historias de usuario**
- US-045
- US-047
- US-048

**Depends on**
- `order-creation-core`
- `frontend-shell-access-control`

**Justificación de dependencias**  
- No se puede iniciar un pago sin un pedido existente y una UI de checkout funcional.

---

## 14) `order-fsm-and-audit-trail`

**Descripción**  
Implementa la máquina de estados del pedido, cancelaciones, historial append-only, transición automática por pago aprobado y restauración/decremento de stock.

**Problema que resuelve**  
Sin FSM y auditoría, el pedido no tiene trazabilidad ni operación segura.

**Habilita**  
Seguimiento confiable, operación interna y control robusto del ciclo de vida del pedido.

**Historias de usuario**
- US-039
- US-040
- US-041
- US-042
- US-043
- US-044
- US-046

**Depends on**
- `order-creation-core`
- `mercadopago-payment-flow`
- `auth-rbac-core`

**Justificación de dependencias**  
- Necesita pedidos existentes, pagos reales y permisos por rol para ejecutar transiciones válidas.

---

## 15) `customer-order-tracking`

**Descripción**  
Permite al cliente ver sus pedidos, su detalle, confirmación de creación y feedback del estado de pago.

**Problema que resuelve**  
El cliente necesita trazabilidad de su compra y visibilidad del estado real de su pedido.

**Habilita**  
Experiencia post-compra y reducción de incertidumbre del usuario.

**Historias de usuario**
- US-049
- US-050
- US-071
- US-072

**Depends on**
- `order-creation-core`
- `mercadopago-payment-flow`
- `order-fsm-and-audit-trail`
- `frontend-shell-access-control`

**Justificación de dependencias**  
- Requiere pedidos creados, pagos registrados, estados consistentes y UI autenticada.

---

## 16) `operations-order-management`

**Descripción**  
Implementa la vista operativa de pedidos para admin/gestor, incluyendo visualización global y soporte a la gestión diaria.

**Problema que resuelve**  
La operación interna necesita herramientas para ejecutar el flujo operativo del negocio.

**Habilita**  
Procesamiento interno de pedidos y control operativo del ciclo de vida.

**Historias de usuario**
- US-051
- US-052
- US-065

**Depends on**
- `order-fsm-and-audit-trail`
- `frontend-shell-access-control`
- `auth-rbac-core`

**Justificación de dependencias**  
- Necesita trazabilidad, permisos por rol y panel protegido para operar.

---

## 17) `user-administration`

**Descripción**  
Permite listar, editar, desactivar usuarios y asignar roles desde administración.

**Problema que resuelve**  
El sistema necesita gestión administrativa del acceso y control de operadores.

**Habilita**  
Gobernanza de usuarios y mantenimiento del modelo RBAC.

**Historias de usuario**
- US-053
- US-054
- US-055

**Depends on**
- `auth-rbac-core`
- `frontend-shell-access-control`

**Justificación de dependencias**  
- Requiere RBAC firme y UI administrativa protegida.

---

## 18) `admin-dashboard-metrics`

**Descripción**  
Implementa dashboard administrativo con métricas generales, ventas por período, top productos y pedidos por estado.

**Problema que resuelve**  
La administración necesita visibilidad del negocio para tomar decisiones operativas.

**Habilita**  
Monitoreo de performance y lectura ejecutiva del sistema.

**Historias de usuario**
- US-056
- US-057
- US-058
- US-059

**Depends on**
- `operations-order-management`
- `mercadopago-payment-flow`
- `product-catalog-management`

**Justificación de dependencias**  
- Depende de datos reales y consistentes de catálogo, pedidos y pagos.

---

## 19) `system-configuration`

**Descripción**  
Expone la configuración global del sistema para parámetros operativos y catálogos administrables.

**Problema que resuelve**  
Algunas reglas operativas deben poder ajustarse sin tocar código.

**Habilita**  
Administración más flexible del sistema en producción.

**Historias de usuario**
- US-060

**Depends on**
- `auth-rbac-core`
- `operations-order-management`
- `admin-dashboard-metrics`

**Justificación de dependencias**  
- Conviene implementarlo al final, cuando ya están claros los parámetros realmente necesarios y el dominio está estabilizado.

---

## Mapa visible de dependencias

### Grafo simplificado

```text
bootstrap-foundation
└── auth-rbac-core
    ├── frontend-shell-access-control
    │   ├── public-catalog-experience
    │   │   └── shopping-cart
    │   │       └── checkout-preflight-validation
    │   │           └── order-creation-core
    │   │               ├── mercadopago-payment-flow
    │   │               │   ├── order-fsm-and-audit-trail
    │   │               │   │   ├── customer-order-tracking
    │   │               │   │   └── operations-order-management
    │   │               │   │       └── admin-dashboard-metrics
    │   │               │   │           └── system-configuration
    │   │               │   └── customer-order-tracking
    │   │               └── order-fsm-and-audit-trail
    │   ├── customer-profile
    │   │   └── delivery-addresses
    │   │       └── checkout-preflight-validation
    │   ├── operations-order-management
    │   └── user-administration
    ├── category-management
    │   └── product-catalog-management
    │       ├── public-catalog-experience
    │       └── admin-dashboard-metrics
    └── ingredient-management
        └── product-catalog-management
```

---

## Agrupación por macro-capacidades

### Plataforma base
- `bootstrap-foundation`
- `auth-rbac-core`
- `frontend-shell-access-control`

### Catálogo
- `category-management`
- `ingredient-management`
- `product-catalog-management`
- `public-catalog-experience`

### Cuenta cliente
- `customer-profile`
- `delivery-addresses`

### Compra
- `shopping-cart`
- `checkout-preflight-validation`
- `order-creation-core`
- `mercadopago-payment-flow`

### Pedidos y trazabilidad
- `order-fsm-and-audit-trail`
- `customer-order-tracking`
- `operations-order-management`

### Administración
- `user-administration`
- `admin-dashboard-metrics`
- `system-configuration`

---

## Puntos de control por macro-capacidad

Estos controles ayudan a detectar desvíos temprano sin cambiar la cantidad ni el orden de los changes.

### Plataforma base

- `bootstrap-foundation` debe dejar backend y frontend arrancables con comandos documentados, aunque todavía no tenga casos de negocio completos.
- `auth-rbac-core` debe probar explícitamente 401, 403, expiración de access token, rotación de refresh token y asignación automática de rol `CLIENT`.
- `frontend-shell-access-control` debe centralizar guards, interceptores y manejo global de errores para que las pantallas futuras no dupliquen lógica de sesión.

### Catálogo

- `category-management` debe incluir validación contra ciclos en jerarquías y comportamiento definido para categorías con hijos o productos asociados.
- `ingredient-management` debe separar claramente ingrediente, alérgeno y removibilidad; la removibilidad pertenece a la relación producto-ingrediente, no al ingrediente global.
- `product-catalog-management` debe dejar resueltas las reglas de disponibilidad: `disponible=false`, `stock_cantidad=0` y soft delete no son equivalentes.
- `public-catalog-experience` debe consumir el mismo contrato de filtros y paginación que usa administración para evitar duplicar modelos.

### Cuenta cliente y compra

- `delivery-addresses` debe garantizar ownership por JWT y una única dirección principal por usuario con operación atómica.
- `shopping-cart` debe validar personalizaciones contra ingredientes removibles y versionar la estructura persistida en localStorage para soportar migraciones futuras.
- `checkout-preflight-validation` debe devolver diferencias accionables: producto no disponible, precio cambiado, stock insuficiente o ingrediente inválido.
- `order-creation-core` debe persistir snapshots inmutables y no depender del estado actual del producto para mostrar pedidos históricos.

### Pagos, pedidos y trazabilidad

- `mercadopago-payment-flow` debe tratar webhooks como señales no confiables: responder rápido, registrar evento y consultar estado real a MercadoPago.
- `order-fsm-and-audit-trail` debe centralizar las transiciones en un único servicio; ningún router ni repositorio debería cambiar estado directamente.
- `customer-order-tracking` debe leer historial y pagos sin permitir acceso cruzado entre clientes.
- `operations-order-management` debe exponer acciones según rol y estado, no solo ocultar botones en frontend: el backend debe validar siempre.

### Administración

- `user-administration` debe impedir que el último administrador se quite a sí mismo el rol `ADMIN`.
- `admin-dashboard-metrics` debe documentar fórmulas de métricas, filtros temporales y zona horaria antes de implementarlas.
- `system-configuration` debe limitarse a parámetros realmente operables; no debe convertirse en una tabla genérica para esconder decisiones de diseño.

---

## Ambigüedades y vacíos detectados

Estas definiciones afectan el diseño de specs y conviene resolverlas antes de proponer o aplicar algunos changes:

1. **Roles y estados: IDs numéricos vs claves semánticas**  
   - Unos documentos hablan de IDs estables (`ADMIN=1`, etc.).
   - Otros usan PK semántica (`ADMIN`, `PENDIENTE`, etc.).

2. **Refresh token opaco vs hash almacenado**  
   - Hay documentos que proponen guardar el token opaco.
   - Otros proponen persistir solo `token_hash`.

3. **Formato de errores inconsistente**  
   - Aparece RFC 7807 completo en algunos lugares.
   - En otros aparece un formato simplificado o uno distinto.

4. **Paginación inconsistente**  
   - En algunos docs se usa `skip/limit`.
   - En otros `page/size`.

5. **Formas de pago semilla contradictorias**  
   - Unos documentos hablan de tarjetas crédito/débito.
   - Otros de `MERCADOPAGO`, `EFECTIVO`, `TRANSFERENCIA`.

6. **Snapshot de dirección no igual de explícito en todos los documentos**  
   - La necesidad existe, pero no siempre está modelada con el mismo nivel de detalle.

7. **Alcance de `system-configuration` poco definido**  
   - No queda cerrado qué parámetros deben ser realmente administrables.

8. **Permisos finos entre ADMIN, STOCK y PEDIDOS**  
   - La intención general está clara, pero conviene cerrar permisos exactos por endpoint.

9. **Reserva de stock antes del pago**  
   - La especificación define decremento al confirmar pago, pero no reserva temporal entre pedido pendiente y cobro.

---

## Recomendaciones finales

- Mantener separados `order-creation-core`, `mercadopago-payment-flow` y `order-fsm-and-audit-trail` reduce complejidad y acoplamiento.
- `system-configuration` no debería proponerse en detalle hasta cerrar exactamente qué parámetros son configurables.
- Antes de escribir specs definitivas, conviene unificar:
  - modelo de roles/estados,
  - contrato de errores,
  - contrato de paginación,
  - estrategia de refresh tokens,
  - catálogo real de formas de pago.
