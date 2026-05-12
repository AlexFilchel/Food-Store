# Delta for mercadopago-payment

## ADDED Requirements

### Requirement: Operational payment visibility

Operational order detail MUST expose a read-only payment summary sufficient for order management, including current local payment status, provider signal when available, retryability, and last synchronization time. Operations order management MUST NOT create refunds or mutate provider payments.

#### Scenario: Operator sees payment context

- GIVEN an authenticated `ADMIN` or `PEDIDOS` user views an order with payment data
- WHEN the operational detail is returned
- THEN it includes payment status, provider signal when available, retryability, and last synchronization time

#### Scenario: Payment summary is read-only

- GIVEN an operator is viewing operational order detail
- WHEN they use operations order-management capabilities
- THEN the system SHALL NOT initiate refunds or provider-side payment mutations
