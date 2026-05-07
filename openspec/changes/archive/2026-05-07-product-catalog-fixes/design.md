## Context

The `product-catalog-management` change shipped with functional but rough admin UI. User testing identified UX gaps that don't require backend changes — all fixes are frontend-only except one small backend parameter.

## Decisions

### 1. Product form silent reset → error display + state preservation

**Problem**: When backend rejects a product create/update (e.g., both `is_active` and `is_available` must be true per current backend validation), the form resets silently and the user loses all entered data.

**Decision**: Wrap the form submit in a try/catch that catches the error, displays it via the existing `error` state, and does NOT reset the form on failure. Only reset on success.

**Tradeoff**: The backend validation requiring both flags is a business rule that may need review separately. For now, we surface the error clearly so the admin knows what went wrong.

### 2. Inactive products filter

**Problem**: Products created with `is_active=false` disappear from the list with no way to view them.

**Decision**: Add an "Incluir inactivos" checkbox filter (same pattern as categories) that passes `include_inactive=true` to the backend list endpoint.

**Backend check**: Verify the product list endpoint already supports `include_inactive`. If not, add it as an optional query parameter.

### 3. Allergen selection UX

**Problem**: Multi-select dropdown requires Ctrl+Click which is not discoverable.

**Decision**: Replace the `<select multiple>` with a list of checkboxes, one per allergen. This is more intuitive and matches common patterns for tag-like associations.

**Tradeoff**: Takes more vertical space than a dropdown, but the number of allergens is expected to be small (< 20), so this is acceptable.

### 4. Stock field hint

**Problem**: User tried to enter negative stock to test validation but the input blocked the minus sign, causing confusion.

**Decision**: Per RN-CA05 ("El stock es un entero >= 0; nunca puede ser negativo"), the field correctly rejects negatives. Add a small hint text below the stock input: "El stock no puede ser negativo (mín. 0)."

**Tradeoff**: None — this is documentation of an existing constraint.

### 5. Category card aesthetics

**Problem**: Text in category list cards can overflow or look cramped.

**Decision**: Add `truncate` or `line-clamp` to description text, ensure proper spacing with Tailwind utilities, and use `break-words` for long names.

### 6. Search by category name

**Problem**: Product search only filters by product name, not by category.

**Decision**: The backend already supports `category_id` filter. Add a category dropdown to the product filters that passes the selected category ID to the list query.

## Risks

- Backend `include_inactive` parameter may not exist on product list endpoint — will verify and add if needed.
- Checkbox list for allergens may need styling adjustments to match the design system.
