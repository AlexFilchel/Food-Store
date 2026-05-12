# Delta for mercadopago-payment

## ADDED Requirements

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
