# Tasks: delivery-addresses

## 1. Backend data model and migration

- [x] 1.1 Add delivery address model/table associated to `users.id`.
- [x] 1.2 Add audit fields and soft delete support for delivery addresses.
- [x] 1.3 Add `is_default` flag and indexes needed for user-owned queries.
- [x] 1.4 Create Alembic migration for the delivery addresses table.

## 2. Backend API and domain logic

- [x] 2.1 Add public-safe delivery address response schema.
- [x] 2.2 Add create/update request schemas with required fields and normalization.
- [x] 2.3 Add repository methods for list/detail/create/update/soft-delete by current user.
- [x] 2.4 Add service method to create addresses deriving owner from `current_user.id`.
- [x] 2.5 Add service method to update only current user's non-deleted addresses.
- [x] 2.6 Add service method to soft-delete only current user's non-deleted addresses.
- [x] 2.7 Add service method to mark one address as default and unset others atomically.
- [x] 2.8 Add canonical not-found/validation errors where existing contracts are insufficient.
- [x] 2.9 Add authenticated router under `/api/v1/customer/addresses`.
- [x] 2.10 Register delivery address router in the API router.

## 3. Backend verification

- [x] 3.1 Test authenticated user can create and list own addresses.
- [x] 3.2 Test anonymous requests return canonical 401.
- [x] 3.3 Test client-supplied `user_id` cannot assign address owner.
- [x] 3.4 Test user cannot view/update/delete another user's address and receives not-found.
- [x] 3.5 Test update changes only current user's address.
- [x] 3.6 Test soft-deleted address is excluded from list/detail/update/delete.
- [x] 3.7 Test first address becomes default.
- [x] 3.8 Test creating or marking a new default unsets previous default atomically.
- [x] 3.9 Test deleting default address leaves no invalid default according to service rule.
- [x] 3.10 Test invalid payload returns canonical validation errors.
- [x] 3.11 Test response excludes owner/security internals.

## 4. Frontend data layer

- [x] 4.1 Add delivery address TypeScript types.
- [x] 4.2 Add delivery address API client for list/create/update/delete/set-default.
- [x] 4.3 Add TanStack Query keys and hooks for list and mutations.
- [x] 4.4 Invalidate/update address queries after successful mutations.

## 5. Frontend UI

- [x] 5.1 Add protected address management section to the customer area.
- [x] 5.2 Render loading, error, empty and success states for address list.
- [x] 5.3 Add create address form with required fields.
- [x] 5.4 Add edit address flow for existing addresses.
- [x] 5.5 Add delete address action with stable UI feedback.
- [x] 5.6 Add mark-as-default action and default badge/state.
- [x] 5.7 Preserve form input on validation errors.
- [x] 5.8 Ensure sensitive auth/token/internal metadata is never rendered in address errors.

## 6. Frontend verification

- [x] 6.1 Test authenticated customer sees address management UI.
- [x] 6.2 Test anonymous user is redirected away from protected customer area.
- [x] 6.3 Test empty/list loading/error states.
- [x] 6.4 Test create address success refreshes list and resets form.
- [x] 6.5 Test edit address success reflects updated data.
- [x] 6.6 Test delete address removes it from visible list.
- [x] 6.7 Test mark-as-default renders exactly one default address.
- [x] 6.8 Test validation/API errors preserve form data and hide sensitive metadata.

## 7. OPSX closure readiness

- [x] 7.1 Confirm proposal, design, spec and tasks match implemented behavior.
- [x] 7.2 Run targeted backend and frontend tests for the change.
- [x] 7.3 Run verify and resolve blockers before archive.
