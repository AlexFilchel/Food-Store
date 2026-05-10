## ADDED Requirements

### Requirement: Delivery address persistence
The system SHALL persist delivery addresses owned by authenticated users with audit metadata, soft delete support and a default-address flag.

#### Scenario: Address is created for current user
- **WHEN** an authenticated user creates a delivery address with valid required fields
- **THEN** the system stores the address associated with the current user's id and returns the public address payload

#### Scenario: Client cannot assign address owner
- **WHEN** a create or update request includes a client-supplied `user_id` or owner field
- **THEN** the backend ignores or rejects that field and derives ownership from the bearer token

#### Scenario: Deleted address is excluded
- **WHEN** an address is soft-deleted
- **THEN** default list, detail, update and delete operations treat it as unavailable for normal customer use

### Requirement: Delivery address CRUD API
The system SHALL expose authenticated customer APIs to list, create, read, update and delete the current user's delivery addresses.

#### Scenario: Customer lists own addresses
- **WHEN** an authenticated user requests their delivery addresses
- **THEN** the API returns only that user's non-deleted addresses in a stable order with the default address identifiable

#### Scenario: Customer views own address detail
- **WHEN** an authenticated user requests one of their non-deleted addresses by id
- **THEN** the API returns the address public payload

#### Scenario: Customer updates own address
- **WHEN** an authenticated user submits valid updates for one of their non-deleted addresses
- **THEN** the API updates that address and returns the updated public payload

#### Scenario: Customer deletes own address
- **WHEN** an authenticated user deletes one of their non-deleted addresses
- **THEN** the API soft-deletes the address and excludes it from subsequent customer lists

#### Scenario: Missing or foreign address is hidden
- **WHEN** an authenticated user requests, updates or deletes a missing address or another user's address
- **THEN** the API returns the canonical not-found error without exposing whether the address belongs to another user

#### Scenario: Anonymous address access is rejected
- **WHEN** a request without a valid bearer token calls a delivery address endpoint
- **THEN** the API returns HTTP 401 using the canonical error contract

### Requirement: Single default delivery address
The system SHALL maintain at most one non-deleted default delivery address per user.

#### Scenario: First address becomes default
- **WHEN** a user creates their first delivery address
- **THEN** the system stores it as the user's default address

#### Scenario: Creating a new default address replaces previous default
- **WHEN** a user creates an address with `is_default=true` and already has a default address
- **THEN** the system makes the new address default and unsets default on the previous address in the same operation

#### Scenario: Customer marks an existing address as default
- **WHEN** an authenticated user marks one of their own non-deleted addresses as default
- **THEN** the system sets that address as default and unsets default on the user's other non-deleted addresses atomically

#### Scenario: Deleting default address leaves no invalid default
- **WHEN** a user deletes their default address
- **THEN** the deleted address is no longer returned as default and the system either selects another active address as default or leaves no default according to the documented service rule

### Requirement: Delivery address validation and contracts
The system SHALL validate delivery address payloads using canonical validation errors and public-safe response schemas.

#### Scenario: Required address fields are missing or blank
- **WHEN** a customer submits an address without required fields such as recipient name, phone, street, street number, city, province or postal code
- **THEN** the API rejects the request with field-level validation errors in the canonical error contract

#### Scenario: Optional address fields are normalized
- **WHEN** a customer submits optional fields such as floor, apartment or reference as blank strings
- **THEN** the system stores them as null or normalized empty-safe values according to the schema

#### Scenario: Address response excludes internals
- **WHEN** an address API returns a payload
- **THEN** the response excludes password data, auth tokens, internal security metadata and any owner fields not needed by the UI

### Requirement: Delivery address frontend
The system SHALL provide a protected frontend experience for customers to manage their own delivery addresses.

#### Scenario: Customer opens address management UI
- **WHEN** an authenticated customer navigates to the customer area
- **THEN** the frontend renders a delivery address management section inside the authenticated shell

#### Scenario: Anonymous user cannot manage addresses
- **WHEN** an anonymous user navigates to the protected customer area
- **THEN** the frontend redirects to login and does not render address management controls

#### Scenario: Customer creates address from UI
- **WHEN** the customer submits a valid new address form
- **THEN** the frontend calls the create address API, shows success feedback, clears or resets the form and refreshes the address list

#### Scenario: Customer edits address from UI
- **WHEN** the customer submits valid edits for an existing address
- **THEN** the frontend calls the update address API, shows success feedback and reflects the updated address in the list

#### Scenario: Customer deletes address from UI
- **WHEN** the customer deletes an address
- **THEN** the frontend calls the delete address API and removes the address from the visible list after success

#### Scenario: Customer marks default address from UI
- **WHEN** the customer marks an address as default
- **THEN** the frontend calls the default-address API and renders exactly one visible address as default after success

#### Scenario: Address UI handles loading, error and empty states
- **WHEN** the address list is loading, fails or contains no addresses
- **THEN** the frontend displays clear loading, error or empty states without crashing

#### Scenario: Address form errors preserve input safely
- **WHEN** the backend rejects an address form with canonical validation errors
- **THEN** the frontend displays a useful error, preserves entered form data and does not expose sensitive metadata
