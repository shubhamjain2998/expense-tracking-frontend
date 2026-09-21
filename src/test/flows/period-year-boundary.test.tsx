/**
 * Regression test for `YearMonthSelector` stepping across a year boundary.
 *
 * Bug: `step()` used to call `onYearChange(y)` then `onMonthChange(m)` as
 * two separate `setSearchParams` calls in the same click handler. Each call
 * reads a memoized snapshot of the current search params, so the second
 * call clobbered the first instead of composing — stepping from Dec 2025
 * forward landed on `year=2025&month=1` instead of `year=2026&month=1`.
 * Same class of bug as the Clear Filters fix (see multi-filters.test.tsx).
 *
 * Fixed by giving `YearMonthSelector` a single `onPeriodChange(year, month)`
 * callback wired to `usePeriod`'s combined `setPeriod`, used by both the
 * stepper and the year `<select>`.
 */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DashboardPage } from '@/pages/DashboardPage'

import { renderWithProviders } from '../renderWithProviders'

// jsdom has no matchMedia implementation; DashboardPage's useCountUp hook
// (via VerdictBlock) reads it for prefers-reduced-motion.
beforeAll(() => {
  if (typeof window.matchMedia === 'function') return
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

describe('YearMonthSelector — year boundary stepping', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('pf_onboarded', 'true')
    localStorage.setItem('pf_checklist_dismissed', 'true')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('pf_onboarded')
    localStorage.removeItem('pf_checklist_dismissed')
  })

  it('stepping forward from December carries the year increment instead of dropping it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />, {
      initialEntries: ['/dashboard?year=2025&month=12'],
    })

    await screen.findByText(/Dec 2025/)

    await user.click(screen.getByRole('button', { name: 'Next month' }))

    // Both the year AND the month must have moved together — Jan 2026, not
    // Jan 2025 (the year silently dropped) and not still Dec 2025 (the
    // month silently dropped).
    expect(await screen.findByText(/Jan 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/Jan 2025/)).not.toBeInTheDocument()
  })

  it('stepping backward from January carries the year decrement instead of dropping it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />, {
      initialEntries: ['/dashboard?year=2026&month=1'],
    })

    await screen.findByText(/Jan 2026/)

    await user.click(screen.getByRole('button', { name: 'Previous month' }))

    expect(await screen.findByText(/Dec 2025/)).toBeInTheDocument()
    expect(screen.queryByText(/Dec 2026/)).not.toBeInTheDocument()
  })
})
