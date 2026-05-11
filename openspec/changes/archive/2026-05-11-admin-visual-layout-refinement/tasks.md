# Tasks

## 1. Admin visual foundation

- [x] 1.1 Audit radius utilities in the three admin management pages.
- [x] 1.2 Apply a compact radius scale to containers, cards, fields, selects, buttons, badges, messages, and internal blocks.
- [x] 1.3 Preserve current palette, shadows, focus rings, spacing rhythm, and admin identity.

## 2. Categories layout and grid

- [x] 2.1 Move `Crear categoría` / edit form into a full-width top block instead of a lateral column.
- [x] 2.2 Reorganize form fields responsively: name prominent, description full width, parent/order/state grouped cleanly.
- [x] 2.3 Replace the category card list with an administrative grid/table with headers for name, slug/code, state, parent, order, updated at, and actions.
- [x] 2.4 Keep active/inactive badges, empty/loading/error states, and right-aligned edit/delete actions.
- [x] 2.5 Keep hierarchy/tree context available without making it compete with the primary grid.

## 3. Ingredients and allergens layout and grids

- [x] 3.1 Stack the Ingredients form first as a full-width block.
- [x] 3.2 Stack the Allergens form below as a full-width block.
- [x] 3.3 Improve field grouping and keep primary submit buttons visually primary.
- [x] 3.4 Replace ingredient list cards with an administrative grid/table including state, associated allergens, and actions.
- [x] 3.5 Replace allergen list cards with an administrative grid/table including state and actions.
- [x] 3.6 Preserve search, include-inactive behavior, empty/loading/error states, and checkbox-based allergen selection.

## 4. Products layout and grid

- [x] 4.1 Keep product filters above the form/list with a responsive layout.
- [x] 4.2 Move create/edit product form into a full-width block.
- [x] 4.3 Reorganize fields: name wide, description full, price+stock row, active+available row, categories/ingredients balanced.
- [x] 4.4 Replace product card list with an administrative grid/table with columns name, price, stock, availability, state, categories, ingredients, and actions.
- [x] 4.5 Use badges for availability, stock, active/inactive state, categories, and ingredients.

## 5. Verification

- [x] 5.1 Update affected React tests only where layout semantics changed.
- [ ] 5.2 Manually review responsive behavior at mobile, tablet, and desktop breakpoints.
- [x] 5.3 Verify keyboard focus, labels, alert roles, disabled states, and action button accessibility remain intact.
- [x] 5.4 Run the project test command if available during apply; do not run build unless explicitly requested.
