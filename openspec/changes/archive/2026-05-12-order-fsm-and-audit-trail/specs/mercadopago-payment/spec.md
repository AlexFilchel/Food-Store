# Delta for mercadopago-payment

## MODIFIED Requirements

### Requirement: Payment-driven FSM synchronization

Payment status changes MUST synchronize orders only through the order FSM. Approved payments SHALL request `PENDIENTE -> CONFIRMADO`; cancelled or expired payments SHALL request `PENDIENTE -> CANCELADO`; rejected payments SHALL keep the order in `PENDIENTE` so the customer can retry payment. Payment events for non-pending or terminal orders MUST NOT bypass FSM guards.

#### Scenario: Approved payment confirms order

- GIVEN a payment is verified as approved for an order in `PENDIENTE`
- WHEN the payment event is processed
- THEN the order transitions to `CONFIRMADO`
- AND the transition audit source is `payment`

#### Scenario: Rejected payment keeps pending order retryable

- GIVEN a payment is verified as rejected for an order in `PENDIENTE`
- WHEN the payment event is processed
- THEN the order remains `PENDIENTE`
- AND the payment records the rejection reason
- AND reserved stock remains assigned to the order for a retry

### Requirement: Idempotent external payment events

Repeated MercadoPago webhook or polling events for the same external payment status MUST be idempotent. The system SHALL update payment/event processing without creating duplicate order transitions, duplicate audit entries, or duplicate stock side effects.

#### Scenario: Duplicate approval event is ignored for order transition

- GIVEN an approved payment already transitioned its order to `CONFIRMADO`
- WHEN the same approved event is received again
- THEN the payment event is recorded or marked processed idempotently
- AND no additional order history entry is appended

#### Scenario: Late rejected event cannot cancel confirmed order

- GIVEN an order is already `CONFIRMADO` from an approved payment
- WHEN a repeated or late rejected event is processed for the same payment flow
- THEN the FSM MUST reject or ignore the order transition
- AND the order remains `CONFIRMADO`

## MODIFIED Requirements

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
