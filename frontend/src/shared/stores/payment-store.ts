import { create } from 'zustand'

type PaymentStatus = 'idle' | 'processing' | 'approved' | 'rejected' | 'error'

interface PaymentStore {
  checkoutStep: 'idle' | 'summary' | 'payment' | 'confirmation'
  preferenceId: string | null
  paymentStatus: PaymentStatus
  error: string | null
  startCheckout: () => void
  setPreference: (preferenceId: string) => void
  updatePaymentStatus: (status: PaymentStatus) => void
  setError: (error: string | null) => void
  resetPayment: () => void
}

const initialState = {
  checkoutStep: 'idle' as const,
  preferenceId: null,
  paymentStatus: 'idle' as const,
  error: null,
}

export const usePaymentStore = create<PaymentStore>((set) => ({
  ...initialState,
  startCheckout: () => set({ checkoutStep: 'summary', paymentStatus: 'processing', error: null }),
  setPreference: (preferenceId) => set({ preferenceId, checkoutStep: 'payment' }),
  updatePaymentStatus: (paymentStatus) =>
    set({
      paymentStatus,
      checkoutStep: paymentStatus === 'approved' ? 'confirmation' : 'payment',
    }),
  setError: (error) => set({ error, paymentStatus: 'error' }),
  resetPayment: () => set(initialState),
}))
