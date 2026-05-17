## 1. Backend registry and data model

- [x] 1.1 Inspect existing backend module, migration, RBAC, settings, audit/logging, order creation, and dashboard metrics patterns before implementation
- [x] 1.2 Define the system configuration registry with key, type, category, default, visibility, editability, sensitivity, validation rules, and description metadata
- [x] 1.3 Add initial registered keys: `business.timezone`, `store.ordering_enabled`, `store.public_name`, `store.contact_phone`, `store.contact_email`, `store.address_text`, `orders.max_items_per_order`, `orders.max_quantity_per_item`, and `orders.pending_payment_expiration_minutes`
- [x] 1.4 Add SQLAlchemy models and Alembic migration for configuration overrides with version/concurrency metadata
- [x] 1.5 Add SQLAlchemy model and Alembic migration for append-only configuration audit entries
- [x] 1.6 Add safe seed/default handling so the system resolves effective defaults even when no database overrides exist

## 2. Backend service and validation

- [x] 2.1 Implement typed value normalization and serialization for string, nullable string, boolean, integer, and timezone settings
- [x] 2.2 Implement registry validation for unknown keys, read-only keys, invalid types, unsafe ranges, invalid timezone, and sensitivity/visibility rules
- [x] 2.3 Implement effective configuration resolution from registry defaults plus database overrides
- [x] 2.4 Implement atomic multi-key update with transaction rollback on any validation failure
- [x] 2.5 Implement optimistic concurrency checks using version or last-updated metadata when expected versions are provided
- [x] 2.6 Implement per-key audit entry creation for successful real changes only, including old value, new value, user, timestamp, optional reason, and request correlation when available
- [x] 2.7 Ensure no audit entries are created for validation failures or no-op unchanged values

## 3. Backend API integration

- [x] 3.1 Add protected `GET /api/v1/admin/system/configuration` endpoint restricted to `ADMIN`
- [x] 3.2 Add protected `PATCH /api/v1/admin/system/configuration` endpoint restricted to `ADMIN`
- [x] 3.3 Add safe `GET /api/v1/system/configuration/public` endpoint returning only public non-sensitive keys
- [x] 3.4 Return canonical 401/403 errors for anonymous and non-admin administrative access
- [x] 3.5 Return field-level canonical validation errors for unknown keys, invalid values, read-only updates, and stale conflicts
- [x] 3.6 Wire the router into the existing FastAPI app/admin route structure without duplicating RBAC logic

## 4. Consumer behavior integration

- [x] 4.1 Update dashboard metrics default timezone resolution to use `business.timezone` when no request timezone is provided
- [x] 4.2 Preserve explicit timezone request parameter behavior for dashboard metrics when supplied and valid
- [x] 4.3 Gate new order creation with `store.ordering_enabled` while keeping catalog browsing, login, admin operations, and existing order tracking available
- [x] 4.4 Apply `orders.max_items_per_order` and `orders.max_quantity_per_item` in the appropriate preflight/order validation path without trusting frontend-only checks
- [x] 4.5 Ensure `orders.pending_payment_expiration_minutes` is exposed to backend consumers without changing historical payment records silently

## 5. Backend tests

- [x] 5.1 Add registry tests for defaults, metadata, public/admin visibility, unknown keys, and read-only behavior
- [x] 5.2 Add validation tests for timezone, integer ranges, nullable public fields, booleans, and type mismatches
- [x] 5.3 Add permission tests for admin success, client forbidden, and anonymous unauthorized access on admin endpoints
- [x] 5.4 Add atomic update tests proving invalid multi-key updates persist no values
- [x] 5.5 Add audit tests proving one entry per changed key, no entries on rejected updates, and no fake entries for no-op values
- [x] 5.6 Add optimistic concurrency tests for stale and fresh updates
- [x] 5.7 Add public endpoint tests proving only public non-sensitive keys are returned
- [x] 5.8 Add consumer tests for dashboard default timezone, disabled ordering, order limits, and existing order tracking remaining available

## 6. Frontend API and server state

- [x] 6.1 Add TypeScript types for configuration metadata, values, categories, update payloads, validation errors, public config, and conflict errors
- [x] 6.2 Add API client functions for admin list, admin patch, and public configuration read endpoints
- [x] 6.3 Add TanStack Query hooks with stable query keys for admin configuration and public configuration
- [x] 6.4 Add mutation handling that invalidates configuration queries after successful saves
- [x] 6.5 Normalize backend validation and conflict errors into user-safe field/global messages

## 7. Admin configuration UI

- [x] 7.1 Add protected admin route and navigation entry for system configuration following existing shell/sidebar patterns
- [x] 7.2 Build a configuration page grouped by backend categories with consistent dashboard styling (`rounded-xl` outer, `rounded-lg` inner sections)
- [x] 7.3 Render typed controls for boolean, integer, string, nullable string, and timezone fields based on metadata
- [x] 7.4 Show effective value, default value, descriptions, editability, loading, empty, and error states
- [x] 7.5 Implement dirty-state tracking, save/cancel behavior, and success feedback after updates
- [x] 7.6 Show field-level validation messages without losing entered values when backend validation fails
- [x] 7.7 Require explicit confirmation for operationally sensitive keys such as ordering pause, order limits, and pending payment expiration
- [x] 7.8 Handle stale conflict responses by asking the admin to refresh before retrying

## 8. Public configuration frontend usage

- [x] 8.1 Integrate public configuration query where public store metadata is displayed, without exposing admin-only keys
- [x] 8.2 Ensure customer-facing pages tolerate missing optional public contact fields
- [x] 8.3 Ensure ordering-disabled state communicates a clear user-safe message before or during checkout/order creation

## 9. Documentation and verification

- [x] 9.1 Document endpoint paths, request/response shapes, registry keys, validation rules, visibility rules, and audit semantics in the change docs or API docs
- [x] 9.2 Verify migrations apply and rollback safely in the local environment
- [x] 9.3 Run backend tests for configuration, consumers, permissions, validation, audit, and concurrency
- [x] 9.4 Run frontend tests for admin page states, typed controls, validation feedback, mutation success, conflict handling, and public config usage
- [x] 9.5 Manually verify admin can edit safe settings and that disabled ordering blocks only new order creation
- [x] 9.6 Re-run `openspec status --change "system-configuration"` and confirm the change is apply-ready
