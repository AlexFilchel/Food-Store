## Why

User testing revealed several UX issues and missing features in the product catalog management admin UI that block effective testing and daily use.

## What Changes

- Fix product form silent reset: show validation errors and preserve form state when "Activo"/"Disponible" checkboxes cause backend rejection.
- Add "Incluir inactivos" filter to product list to view products with `is_active=false`.
- Replace allergen multi-select (Ctrl+Click) with checkbox list for intuitive selection.
- Add hint text on stock field explaining negative values are not allowed per RN-CA05.
- Minor aesthetic fixes on category cards (text distribution, overflow).
- Add category name to product search filter.

## Capabilities

### Modified Capabilities
- `product-catalog-management`: Product form UX, inactive product visibility, allergen selection UX, stock field hint, category card aesthetics, search by category.

## Impact

- `frontend/src/features/products/ui/product-management-page.tsx`: form error handling, inactive filter, search by category.
- `frontend/src/features/ingredients/ui/ingredient-management-page.tsx`: allergen checkboxes.
- `frontend/src/features/categories/ui/category-management-page.tsx`: card aesthetic tweaks.
- `backend/app/modules/products/schemas.py`: may need `include_inactive` parameter on list endpoint.
