## ADDED Requirements

### Requirement: Product filters and full-width form layout
The system SHALL keep product filters above the product workflow and present product creation/editing as a full-width block.

#### Scenario: Product filters remain above product workflow
- **GIVEN** an authenticated ADMIN navigates to product management
- **WHEN** the product administration page renders
- **THEN** search, category, availability, stock, and inactive filters remain above the form and list area
- **AND** the filter controls use a responsive layout that stacks or wraps cleanly on narrow viewports.

#### Scenario: Product form appears full width before the list
- **GIVEN** the product administration page is visible
- **WHEN** the create/edit product form renders
- **THEN** it appears as a full-width block above the product grid/list
- **AND** it is not placed as a lateral column beside the product list.

#### Scenario: Product form fields are distributed for scanning
- **GIVEN** the product create/edit form is visible
- **WHEN** the viewport supports grouped fields
- **THEN** name is emphasized as a wide field, description spans the form width, price and stock share a row, active and available controls share a row, and categories and ingredients are balanced in the form layout
- **AND** the layout stacks without losing labels, helper text, or validation feedback on narrow viewports.

### Requirement: Product administrative grid
The system SHALL show products below the form in an administrative grid or table optimized for catalog operations.

#### Scenario: Product grid exposes operational columns
- **GIVEN** products are loaded for an ADMIN
- **WHEN** the product list area renders
- **THEN** it displays headers or equivalent accessible labels for name, price, stock, availability, state, categories, ingredients, and actions
- **AND** each product is displayed as a row with subtle dividers rather than as a standalone rounded card.

#### Scenario: Product grid uses badges for key states
- **GIVEN** a product row is visible
- **WHEN** the ADMIN reviews catalog state
- **THEN** availability, stock, active/inactive state, categories, and ingredients are shown with compact badges or equivalent readable tokens
- **AND** stock and availability remain visually distinct states.

#### Scenario: Product row actions and empty states remain clear
- **GIVEN** product data is loaded, empty, loading, or failed
- **WHEN** the product grid renders
- **THEN** loading, empty, and error states remain visible in the product section
- **AND** Edit and Delete actions are grouped at the end of each row and right-aligned on desktop layouts.
