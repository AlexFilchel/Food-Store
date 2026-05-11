# Proposal: Admin Visual Layout Refinement

## Intent

Make Categories, Ingredients, and Products admin screens feel more compact and professional by refining layout structure and radius scale while preserving the current visual identity.

## Scope

### In Scope
- Reduce admin UI radii consistently across containers, cards, fields, buttons, badges, and internal blocks.
- Convert Categories and Products forms from lateral columns to full-width top blocks.
- Convert Ingredients and Allergens forms to vertical full-width sections.
- Replace card-like lists with administrative responsive grids/tables with headers, rows, dividers, badges, empty states, and right-aligned actions.
- Preserve existing colors, spacing language, shadows, data fetching, mutations, and routes.

### Out of Scope
- Backend/API/schema changes.
- Palette redesign, typography redesign, new design system package, or external UI library.
- New CRUD capabilities beyond visual/layout refinements.

## Approach

Refactor only the admin feature UI components with reusable local table/list patterns where practical. Keep current Tailwind utility language and semantic controls, but standardize radii to less pill-like values.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/features/categories/ui/category-management-page.tsx` | Modified | Full-width form, admin grid/list, reduced radii. |
| `frontend/src/features/ingredients/ui/ingredient-management-page.tsx` | Modified | Stacked forms and ingredient/allergen admin grids. |
| `frontend/src/features/products/ui/product-management-page.tsx` | Modified | Filters retained above, full-width form, product admin grid. |
| `*.test.tsx` beside affected pages | Modified | Update expectations for new headings/table/grid semantics as needed. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dense tables degrade mobile UX | Medium | Use responsive overflow or stacked row labels below breakpoints. |
| Visual drift from current identity | Low | Reuse existing palette/shadows/focus states; no new color system. |

## Rollback Plan

Revert the three admin UI component files and related tests. No data migration or backend rollback is required.

## Dependencies

- Existing admin APIs and query hooks.

## Success Criteria

- [ ] Admin pages use a consistent compact radius scale.
- [ ] Forms appear above lists and use responsive field grouping.
- [ ] Lists read as administrative grids/tables with accessible actions and states.
- [ ] OpenSpec validation passes in strict mode.
