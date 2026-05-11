# admin-visual-layout-refinement Specification

## Purpose
TBD - created by archiving change admin-visual-layout-refinement. Update Purpose after archive.
## Requirements
### Requirement: Admin radius consistency
The system SHALL use a consistent compact radius scale across the Categories, Ingredients, Allergens, and Products admin interfaces while preserving rounded corners.

#### Scenario: Admin surfaces use compact rounded shapes
- **GIVEN** an ADMIN views the affected admin pages
- **WHEN** containers, cards, inputs, selects, buttons, badges, messages, and internal blocks are rendered
- **THEN** those elements use a less pill-like rounded style than the prior `rounded-3xl`/`rounded-2xl` dominant treatment
- **AND** corners remain visibly rounded rather than square.

#### Scenario: Badges remain readable without pill-heavy styling
- **GIVEN** an ADMIN views state, availability, stock, category, ingredient, or allergen badges
- **WHEN** badges are rendered in grids or forms
- **THEN** they use compact rounded styling and preserve existing semantic colors.

### Requirement: Admin identity preservation
The system SHALL refine admin layout and density without redesigning the product identity.

#### Scenario: Existing visual identity is preserved
- **GIVEN** the admin UI refinement is applied
- **WHEN** an ADMIN compares the affected pages with the existing application style
- **THEN** the palette, spacing language, shadows, borders, typography scale, and focus-ring color family remain consistent with the current UI
- **AND** no external component library or literal third-party styling is introduced.

### Requirement: Admin responsive and accessible presentation
The system SHALL keep the affected admin pages responsive and accessible after converting card lists into administrative grids or tables.

#### Scenario: Administrative grids adapt to viewport size
- **GIVEN** an ADMIN views an affected admin grid on mobile, tablet, or desktop
- **WHEN** the available width changes
- **THEN** column content remains readable through responsive wrapping, horizontal overflow, or stacked labels
- **AND** primary actions remain reachable without overlapping content.

#### Scenario: Forms and grids preserve accessibility basics
- **GIVEN** an ADMIN uses keyboard or assistive technology on the affected admin pages
- **WHEN** they navigate forms, filters, grids, alerts, and actions
- **THEN** labels, focus indicators, alert roles, disabled states, and table/grid headers or equivalent accessible labels are preserved.

