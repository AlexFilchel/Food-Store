# Tasks: customer-profile

## 1. Backend profile API

- [x] 1.1 Add customer profile request/response schemas for public-safe profile data.
- [x] 1.2 Add profile update schema with validation for first name, last name and email.
- [x] 1.3 Add password change schema validating current password and new password policy.
- [x] 1.4 Add service methods to get/update the current user's profile using `current_user.id` only.
- [x] 1.5 Add service method to change current user's password after verifying current password.
- [x] 1.6 Add stable canonical errors for duplicate profile email and invalid current password if existing errors are insufficient.
- [x] 1.7 Add authenticated profile router under `/api/v1/customer/profile` or equivalent account-owned route.
- [x] 1.8 Register the profile router in the API router with auth dependencies.

## 2. Backend verification

- [x] 2.1 Test authenticated profile retrieval returns public fields and excludes sensitive fields.
- [x] 2.2 Test anonymous profile retrieval/update/password change return canonical 401.
- [x] 2.3 Test profile update changes only current user data and recalculates full name.
- [x] 2.4 Test duplicate email update returns canonical duplicate-email error.
- [x] 2.5 Test invalid profile payload returns canonical validation errors.
- [x] 2.6 Test password change with correct current password succeeds with HTTP 204.
- [x] 2.7 Test incorrect current password returns canonical invalid-current-password error.
- [x] 2.8 Test new password logs in and old password no longer authenticates.

## 3. Frontend profile data layer

- [x] 3.1 Add customer profile TypeScript types separate from auth token response types where useful.
- [x] 3.2 Add profile API client for get/update/change-password endpoints.
- [x] 3.3 Add TanStack Query hooks/keys for profile read and mutations.
- [x] 3.4 Ensure successful profile update synchronizes `auth-store.user`.

## 4. Frontend profile UI

- [x] 4.1 Replace client placeholder page with protected customer profile experience.
- [x] 4.2 Render current profile information inside the authenticated shell.
- [x] 4.3 Add editable profile form for first name, last name and email.
- [x] 4.4 Add loading, error, success and validation states for profile update.
- [x] 4.5 Add password change form with current password, new password and confirmation.
- [x] 4.6 Block password confirmation mismatch client-side before API call.
- [x] 4.7 Clear password fields on successful password change.
- [x] 4.8 Ensure no sensitive token/hash/security metadata is rendered in profile errors.

## 5. Frontend verification

- [x] 5.1 Test authenticated customer can render profile page.
- [x] 5.2 Test anonymous user is redirected away from the protected profile page.
- [x] 5.3 Test profile update success updates visible user/auth state.
- [x] 5.4 Test profile update validation/duplicate errors preserve form data.
- [x] 5.5 Test password change success clears password fields.
- [x] 5.6 Test password confirmation mismatch blocks API call.
- [x] 5.7 Test password change API errors render safely without sensitive data.

## 6. OPSX closure readiness

- [x] 6.1 Confirm proposal, design, spec and tasks match the implemented behavior.
- [x] 6.2 Run targeted backend and frontend tests for the change.
- [x] 6.3 Run verify and resolve any blockers before archive.
