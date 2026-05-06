import { useEffect } from 'react'

import { useFeedbackStore } from '@/shared/stores/feedback-store'

export function GlobalFeedbackBanner() {
  const error = useFeedbackStore((state) => state.error)
  const clearError = useFeedbackStore((state) => state.clearError)

  useEffect(() => {
    if (!error) {
      return
    }

    const timeout = window.setTimeout(() => {
      clearError()
    }, 6000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [clearError, error])

  if (!error) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm" role="alert">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{error.title}</p>
          <p className="mt-1 text-sm text-amber-900">{error.message}</p>
        </div>
        <button
          aria-label="Cerrar mensaje global"
          className="rounded-full border border-amber-300 px-3 py-1 text-sm font-medium"
          onClick={clearError}
          type="button"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
