## ADDED Requirements

### Requirement: Category admin full-width form layout
The system SHALL present category creation and editing as a full-width top workflow block instead of a lateral column.

#### Scenario: ADMIN creates a category from a full-width top block
- **GIVEN** an authenticated ADMIN navigates to category management
- **WHEN** the category administration page renders
- **THEN** the `Crear categoría` form appears above the category administration grid/list area as a full-width block
- **AND** it does not occupy a right-side lateral column beside the category list.

#### Scenario: Category form fields are responsively organized
- **GIVEN** the category create/edit form is visible
- **WHEN** the viewport supports multiple columns
- **THEN** name is presented prominently, description can span the form width, and parent/order/state controls are grouped into clear responsive rows
- **AND** on narrow viewports the same fields stack without losing labels or validation messages.

### Requirement: Category administrative grid
The system SHALL show categories below the form in an administrative grid or table optimized for scanning and operations.

#### Scenario: Category grid exposes administrative columns
- **GIVEN** categories are loaded for an ADMIN
- **WHEN** the category list area renders
- **THEN** it displays headers or equivalent accessible labels for name, slug or code, state, parent, order, updated at, and actions
- **AND** each category is displayed as a row with subtle dividers rather than as a standalone rounded card.

#### Scenario: Category row actions and state badges are clear
- **GIVEN** a category row is visible
- **WHEN** the ADMIN reviews available operations
- **THEN** active or inactive state is shown with a badge
- **AND** Edit and Delete actions are grouped at the end of the row and right-aligned on desktop layouts.

#### Scenario: Category empty and support views remain available
- **GIVEN** no categories are returned or hierarchy context is needed
- **WHEN** the category page renders
- **THEN** the page shows the existing empty/loading/error feedback as appropriate
- **AND** hierarchy/tree context remains available without replacing the primary administrative grid.
