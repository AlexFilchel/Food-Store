import { orderQueryKeys } from '@/features/orders/model/hooks'

describe('orderQueryKeys', () => {
  it('builds serializable stable list keys with filters', () => {
    const key = orderQueryKeys.list({ state_code: 'PENDIENTE', skip: 0, limit: 10 })
    expect(key).toEqual(['orders', 'list', { state_code: 'PENDIENTE', skip: 0, limit: 10 }])
  })

  it('builds detail and payment result keys', () => {
    expect(orderQueryKeys.detail(12)).toEqual(['orders', 'detail', 12])
    expect(orderQueryKeys.paymentResult('order-12')).toEqual(['orders', 'payment-result', 'order-12'])
  })
})
