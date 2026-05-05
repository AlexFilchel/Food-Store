import { render, screen } from '@testing-library/react'

import { AppShell } from '@/shared/ui/app-shell'

describe('AppShell', () => {
  it('renders children', () => {
    render(
      <AppShell>
        <span>foundation-ready</span>
      </AppShell>,
    )

    expect(screen.getByText('foundation-ready')).toBeInTheDocument()
  })
})
