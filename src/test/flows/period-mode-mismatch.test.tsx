/**
 * Regression tests for the sticky period drifting three months when the
 * period MODE and the stored/URL period units disagree.
 *
 * Bug this guards against: the period was persisted in period units (1-12 in
 * whichever mode was active) with no record of the mode. A value written
 * under calendar mode — September is 9 — then read back under FY mode, where
 * 9 is December, silently opened the whole app on December. The first paint
 * made it permanent: it resolved with the localStorage mode guess and
 * mirrored that guess back to localStorage before /auth/me could correct it.
 */
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { PERIOD_MODE_STORAGE_KEY, PERIOD_STORAGE_KEY } from '@/lib/period'
import { TransactionsPage } from '@/pages/TransactionsPage'

import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

const BASE = 'http://localhost:8000'

/** Serves /auth/me with an explicit period_mode, overriding the default. */
function serveMode(mode: 'calendar' | 'fy') {
  server.use(
    http.get(`${BASE}/auth/me`, () =>
      HttpResponse.json({
        id: 'user-1',
        email: 'test@example.com',
        period_mode: mode,
        created_at: '2024-06-01T00:00:00Z',
        has_password: true,
      })
    )
  )
}

describe('period mode / period units mismatch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // September 2026: period_month 9 in calendar mode, 6 in FY mode. The two
    // are far enough apart that a mix-up is unmistakable (Sep vs Dec).
    vi.setSystemTime(new Date('2026-09-22T10:00:00Z'))
    localStorage.setItem('access_token', 'test-token')
    localStorage.removeItem(PERIOD_STORAGE_KEY)
    localStorage.removeItem(PERIOD_MODE_STORAGE_KEY)
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.removeItem('access_token')
    localStorage.removeItem(PERIOD_STORAGE_KEY)
    localStorage.removeItem(PERIOD_MODE_STORAGE_KEY)
  })

  it('opens on the current month when the localStorage mode guess is stale', async () => {
    // The device last knew calendar mode; the account is on FY mode. The
    // bootstrap guess must not leak calendar period units into an FY render
    // (period_month 9 would print as December).
    localStorage.setItem(PERIOD_MODE_STORAGE_KEY, 'calendar')
    serveMode('fy')

    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const label = await screen.findByText(/^[A-Za-z]{3} FY \d{2}-\d{2}$/, {
      selector: '.ym-nav-label',
    })
    await waitFor(() => expect(label.textContent).toBe('Sep FY 26-27'))
  })

  it('ignores a legacy period-units value in localStorage rather than misreading it', async () => {
    // Written by the old format under calendar mode (September). Read as FY
    // period units it would be December, so it is dropped in favour of today.
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({ year: 2026, month: 9 }))
    serveMode('fy')

    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const label = await screen.findByText(/^[A-Za-z]{3} FY \d{2}-\d{2}$/, {
      selector: '.ym-nav-label',
    })
    await waitFor(() => expect(label.textContent).toBe('Sep FY 26-27'))
  })

  it('persists the period in calendar units, not period units', async () => {
    // FY period_month 6 is September 2026 — the stored value must say so in
    // calendar terms so the other mode reads back the same real month.
    serveMode('fy')

    renderWithProviders(<TransactionsPage />, {
      initialEntries: ['/transactions?year=2026&month=6'],
    })

    await screen.findByText('Sep FY 26-27', { selector: '.ym-nav-label' })
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PERIOD_STORAGE_KEY) ?? '{}')
      expect(stored).toEqual({ calYear: 2026, calMonth: 9 })
    })
  })

  it('resumes a period stored under one mode as the same real month in the other', async () => {
    // Stored while on FY mode (September 2026 = FY period_month 6); the
    // account is now on calendar mode, where September is period_month 9.
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({ calYear: 2026, calMonth: 9 }))
    serveMode('calendar')

    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const label = await screen.findByText(/^[A-Za-z]{3} \d{4}$/, { selector: '.ym-nav-label' })
    await waitFor(() => expect(label.textContent).toBe('Sep 2026'))
  })
})
