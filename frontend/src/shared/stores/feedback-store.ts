import { create } from 'zustand'

export interface FeedbackMessage {
  title: string
  message: string
}

interface FeedbackStore {
  error: FeedbackMessage | null
  setError: (error: FeedbackMessage) => void
  clearError: () => void
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))
