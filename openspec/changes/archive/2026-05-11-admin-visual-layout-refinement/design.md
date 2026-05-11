# Design: Admin Visual Layout Refinement

## Context

The current admin pages are functional, but several areas use very large `rounded-3xl`/`rounded-2xl` shapes and lateral form/list layouts that feel card-heavy rather than administrative. Categories and Products place the form beside the list at wide breakpoints. Ingredients places ingredients and allergens side-by-side. The requested change is an evolutionary frontend-only refinement: keep identity, behavior, and data contracts; improve density, hierarchy, and scanability.

## Decisions

### 1. Frontend-only scope

No backend or API changes are planned. Existing hooks already expose the fields needed for the requested columns: state flags, parent/category/ingredient/allergen relationships, price, stock, and timestamps where available.

**Tradeoff**: If a displayed label such as parent name is not directly available in a row payload, derive it from the already loaded list/tree data rather than expanding the API.

### 2. Compact radius scale

Replace the pill-heavy visual language with a tighter Tailwind radius scale while keeping rounded corners:

- Page containers and major panels: `rounded-2xl`.
- Cards/forms/internal blocks: `rounded-xl`.
- Inputs/selects/textareas/buttons: `rounded-lg` or `rounded-xl` depending on height.
- Badges: `rounded-md`/`rounded-lg`, not `rounded-full`, unless an existing semantic chip strongly benefits from pill shape.

Keep current colors (`slate`, `violet`, `emerald`, `amber`, `rose`, `sky`), borders, shadows, and focus rings.

### 3. Form-first administrative layout

Each admin screen should read as: header, controls/filters, form block(s), administrative grid/table. This puts creation/editing in the primary workflow and avoids lateral competition between form and data review.

- Categories: summary can remain near the top, then full-width create/edit category form, then category grid/table and tree as supporting admin views.
- Ingredients: ingredient form first, allergen form below, then ingredient grid and allergen grid.
- Products: filters remain above the list/form area, product form becomes full-width, then product grid/table below.

### 4. Grids/tables over card lists

Replace `<ul><li>` card lists with semantic tables when practical, or table-like grids with `role`/labels when responsive stacking is required. Required columns should be visible on desktop and degrade cleanly on small screens with horizontal overflow or stacked labels.

Actions stay right-aligned on desktop, remain reachable on mobile, and keep existing edit/delete button semantics.

### 5. Accessibility and responsiveness

Preserve labels, `aria-invalid`, error announcements, form state preservation, keyboard-focus styles, and button disabled states. Tables/grids should expose headers or equivalent labels. Empty/loading/error states remain visible within the related panel.

## Affected Components

- `frontend/src/features/categories/ui/category-management-page.tsx`
- `frontend/src/features/ingredients/ui/ingredient-management-page.tsx`
- `frontend/src/features/products/ui/product-management-page.tsx`
- Existing tests beside those components, only where expectations depend on old layout semantics.

## Non-goals

- No palette redesign.
- No shared component library extraction unless tiny local helpers reduce duplication safely.
- No backend, model, or API contract changes.
- No build step during propose/apply unless separately requested.
