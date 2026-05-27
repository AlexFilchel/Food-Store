import { act, render, screen } from '@testing-library/react'
import { Route, Routes, MemoryRouter } from 'react-router-dom'

import { SessionInactivityGuard } from '@/app/providers/session-inactivity-guard'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useFeedbackStore } from '@/shared/stores/feedback-store'

describe('SessionInactivityGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAuthStore.getState().clear()
    useFeedbackStore.getState().clearError()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderWithRoute(initialEntry: string) {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <SessionInactivityGuard>
          <Routes>
            <Route path="/app" element={<h1>App protegida</h1>} />
            <Route path="/cocina" element={<h1>Pantalla de cocina</h1>} />
            <Route path="/login" element={<h1>Iniciar sesión</h1>} />
          </Routes>
        </SessionInactivityGuard>
      </MemoryRouter>,
    )
  }

  it('logs out inactive sessions on regular protected routes', async () => {
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: null })

    renderWithRoute('/app')
    expect(screen.getByRole('heading', { name: 'App protegida' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000)
    })

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('keeps the kitchen route active during inactivity', async () => {
    useAuthStore.setState({ accessToken: 'access', refreshToken: 'refresh', user: null })

    renderWithRoute('/cocina')
    expect(screen.getByRole('heading', { name: 'Pantalla de cocina' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16 * 60 * 1000)
    })

    expect(screen.getByRole('heading', { name: 'Pantalla de cocina' })).toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBe('access')
  })
})
