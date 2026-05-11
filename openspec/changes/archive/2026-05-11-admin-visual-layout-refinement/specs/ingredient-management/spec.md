## ADDED Requirements

### Requirement: Ingredient and allergen vertical form layout
The system SHALL present ingredient and allergen management forms as stacked full-width workflow blocks, not side-by-side columns.

#### Scenario: Ingredient form appears first and full width
- **GIVEN** an authenticated ADMIN navigates to ingredient management
- **WHEN** the ingredient administration page renders
- **THEN** the ingredient create/edit form appears first as a full-width block
- **AND** it is not placed in a side-by-side column next to the allergen form or ingredient list.

#### Scenario: Allergen form appears below and full width
- **GIVEN** the ingredient form is visible
- **WHEN** the ADMIN continues through the page
- **THEN** the allergen create/edit form appears below the ingredient form as a full-width block
- **AND** the primary submit buttons preserve their current primary visual treatment.

#### Scenario: Ingredient and allergen fields are grouped cleanly
- **GIVEN** an ADMIN creates or edits ingredients or allergens
- **WHEN** the forms render across responsive breakpoints
- **THEN** name, description, active state, and allergen association controls use clear rows or stacked groups
- **AND** labels, helper text, and error feedback remain associated with their controls.

### Requirement: Ingredient and allergen administrative grids
The system SHALL show ingredients and allergens below the forms as administrative grids or tables with clear states, associations, empty states, and actions.

#### Scenario: Ingredient grid shows state and associated allergens
- **GIVEN** ingredients are loaded for an ADMIN
- **WHEN** the ingredients grid renders
- **THEN** it displays headers or equivalent accessible labels for ingredient identity, state, associated allergens, and actions
- **AND** associated allergens are shown as compact badges or equivalent readable tokens.

#### Scenario: Allergen grid shows state and actions
- **GIVEN** allergens are loaded for an ADMIN
- **WHEN** the allergens grid renders
- **THEN** it displays headers or equivalent accessible labels for allergen identity, state, and actions
- **AND** active or inactive state is shown with a badge.

#### Scenario: Ingredient and allergen grids preserve operational states
- **GIVEN** ingredients or allergens are loading, empty, or fail to load
- **WHEN** the related grid renders
- **THEN** loading, empty, and error states remain visible within the appropriate section
- **AND** Edit and Delete actions remain grouped at the end of each row and right-aligned on desktop layouts.
