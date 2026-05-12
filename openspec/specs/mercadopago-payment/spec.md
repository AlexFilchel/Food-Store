# Spec: mercadopago-payment

## Purpose

Define MercadoPago payment lifecycle integration for order checkout, including initialization, status synchronization, webhook processing, retry behavior, and order-state synchronization through the order FSM.
## Requirements
### Requirement: One active payment per order

The system SHALL reuse an existing payable payment attempt for an order when one is still active, instead of creating duplicate active payments.

#### Scenario: Reuse pending payment
- **GIVEN** an order already has an active payable payment attempt
- **WHEN** the client requests payment init again
- **THEN** the system returns the existing payment preference

### Requirement: Webhooks are untrusted signals

The system SHALL treat webhook payloads as untrusted notifications and SHALL consult MercadoPago before mutating local payment/order state.

#### Scenario: Webhook triggers provider status lookup
- **GIVEN** a payment webhook is received
- **WHEN** the webhook is processed
- **THEN** the system consults MercadoPago status
- **AND** applies state changes only from provider-confirmed status

### Requirement: Payment-driven FSM synchronization

Payment status changes MUST synchronize orders only through the order FSM. Approved payments SHALL request `PENDIENTE -> CONFIRMADO`; cancelled or expired payments SHALL request `PENDIENTE -> CANCELADO`; rejected payments SHALL keep the order in `PENDIENTE` so the customer can retry payment. Payment events for non-pending or terminal orders MUST NOT bypass FSM guards.

#### Scenario: Approved payment confirms order
- **GIVEN** a payment is verified as approved for an order in `PENDIENTE`
- **WHEN** the payment event is processed
- **THEN** the order transitions to `CONFIRMADO`
- **AND** transition audit source is `payment`

#### Scenario: Rejected payment remains retryable
- **GIVEN** a payment is verified as rejected for an order in `PENDIENTE`
- **WHEN** the payment event is processed
- **THEN** the order remains `PENDIENTE`
- **AND** the payment rejection reason is recorded

### Requirement: Idempotent external payment events

Repeated MercadoPago webhook or polling events for the same external payment status MUST be idempotent. The system SHALL update payment/event processing without creating duplicate order transitions, duplicate audit entries, or duplicate stock side effects.

#### Scenario: Duplicate approved event is idempotent
- **GIVEN** an approved payment already transitioned its order to `CONFIRMADO`
- **WHEN** the same approved event is received again
- **THEN** no additional order transition history entry is appended

#### Scenario: Late rejected event cannot downgrade confirmed order
- **GIVEN** an order is already `CONFIRMADO` from an approved payment
- **WHEN** a late rejected event is processed
- **THEN** the order remains `CONFIRMADO`

### Requirement: Auto-confirm on APPROVED via FSM

Payment approval SHALL no longer write order state directly; it MUST call the order FSM and succeed only if the current order state permits `PENDIENTE -> CONFIRMADO`. (Previously: approved payment changed order state to `CONFIRMADO` implicitly.)

#### Scenario: Approval for cancelled order is not applied

- GIVEN an order is already `CANCELADO`
- WHEN MercadoPago reports approval
- THEN the system MUST NOT change the order state
- AND MUST keep a payment/event audit of the ignored transition

### Requirement: Retry support with order payable guard

Payment retry SHALL be allowed only while the related order remains in a payable non-terminal state. Rejected payments for `PENDIENTE` orders SHALL remain retryable; cancelled or expired orders SHALL not be retryable.

#### Scenario: Retry allowed after rejected payment

- GIVEN a rejected payment left the order in `PENDIENTE`
- WHEN the customer requests payment retry
- THEN the system SHALL create a new retry preference

#### Scenario: Retry blocked after order cancellation

- GIVEN a cancelled or expired payment transitioned the order to `CANCELADO`
- WHEN the customer requests payment retry
- THEN the system SHALL reject the retry with a stable non-payable-order error

### Requirement: Customer-visible payment status

Authenticated customers SHALL be able to see the payment status summary for their own order without gaining access to provider secrets or unrelated payment attempts.

#### Scenario: Customer sees own payment status
- GIVEN an authenticated customer owns an order with a payment attempt
- WHEN they view the order detail
- THEN the payment summary shows current status, retry eligibility, and user-safe failure reason when available

#### Scenario: Payment data is ownership-scoped
- GIVEN a payment attempt belongs to another customer's order
- WHEN the authenticated customer requests related order/payment visibility
- THEN the system MUST NOT expose that payment data

### Requirement: MercadoPago return feedback

When MercadoPago redirects a customer back to the application, the frontend SHALL show clear success, rejected, pending, or unknown feedback based on backend-synchronized order/payment state.

#### Scenario: Approved return shows success
- GIVEN MercadoPago redirects after an approved payment
- WHEN the customer opens the payment result page
- THEN the page shows success and links to the order detail

#### Scenario: Rejected return offers retry when payable
- GIVEN MercadoPago redirects after a rejected payment for a `PENDIENTE` order
- WHEN the customer opens the payment result page
- THEN the page explains the rejection
- AND offers retry only when backend marks the order payable

#### Scenario: Pending return avoids false success
- GIVEN MercadoPago status is pending or not yet synchronized
- WHEN the customer opens the payment result page
- THEN the page shows pending/in-process feedback and does not mark the order confirmed

