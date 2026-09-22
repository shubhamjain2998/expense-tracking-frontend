/**
 * Regression tests for the sticky app-wide period (`usePeriod`,
 * `src/hooks/usePeriod.ts`).
 *
 * Bug this guards against: each page used to re-derive its own initial
 * year/month independently, so a period picked on Home silently reset when
 * navigating to Transactions/Budget/Insights/Category — most visibly,
 * Budget ignored the `?month=` URL param entirely.
 */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'

import { Layout } from '@/components/layout/Layout'
import { PERIOD_STORAGE_KEY } from '@/lib/period'
import { BudgetPage } from '@/pages/BudgetPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'

import { renderWithProviders } from '../renderWithProviders'

// Exposes the current router location's search string so tests can assert
// on it without reaching into MemoryRouter internals.
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-search">{location.search}</div>
}

// jsdom has no matchMedia implementation; DashboardPage's useCountUp hook
// (via VerdictBlock) reads it for prefers-reduced-motion. Stub it once for
// this file — the first test file here to render DashboardPage.
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

// jsdom has no IntersectionObserver; SettingsPage's section-scrollspy effect
// reads it. Stub it once for this file — the first test file here to render
// SettingsPage.
beforeAll(() => {
  if (typeof window.IntersectionObserver === 'function') return
  // Deliberately not `implements IntersectionObserver` — that interface picks
  // up new required members (e.g. `scrollMargin`) as TypeScript's DOM lib
  // updates, which would break this mock on every such bump for properties
  // SettingsPage's usage never touches. Cast instead.
  class MockIntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe = () => {}
    unobserve = () => {}
    disconnect = () => {}
    takeRecords = () => []
  }
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

describe('sticky period persistence', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
    localStorage.setItem('pf_onboarded', 'true')
    localStorage.setItem('pf_checklist_dismissed', 'true')
    localStorage.removeItem(PERIOD_STORAGE_KEY)
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('pf_onboarded')
    localStorage.removeItem('pf_checklist_dismissed')
    localStorage.removeItem(PERIOD_STORAGE_KEY)
  })

  it('carries the period from Home to Transactions via the sidenav link', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Route>
      </Routes>,
      { initialEntries: ['/dashboard?year=2026&month=6'] }
    )

    // Home renders June 2026 in the verdict header (MONTH_LABELS_FULL is
    // abbreviated — "Jun", not "June" — despite the name).
    expect(await screen.findByText(/Jun 2026/)).toBeInTheDocument()

    // The sidenav "Transactions" link (not the bottom-tab-bar's "Txns") must
    // carry that same period.
    const txnsLink = screen.getByRole('link', { name: 'Transactions' })
    expect(txnsLink.getAttribute('href')).toBe('/transactions?year=2026&month=6')

    await user.click(txnsLink)

    // Transactions now renders on June 2026 without the user reselecting it.
    expect(await screen.findByText('Jun 2026')).toBeInTheDocument()
  })

  it('resumes the last period from localStorage on a fresh mount with no URL params', async () => {
    // Stored in calendar units — the format is mode-independent on purpose.
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({ calYear: 2025, calMonth: 5 }))

    renderWithProviders(<BudgetPage />, { initialEntries: ['/budget'] })

    // BudgetHeader's eyebrow line ("<year> · N of 12 months elapsed") is the
    // one place the resolved year renders. Poll on both substrings together
    // (not just the year) so this settles past the transient FY-mode first
    // paint (server /auth/me hasn't resolved calendar mode yet) instead of
    // asserting against a mid-flight render.
    const eyebrow = await screen.findByText(
      (content) => content.includes('2025') && content.includes('months elapsed'),
      { selector: 'p.eyebrow' }
    )
    expect(eyebrow).toBeInTheDocument()
  })

  it('falls back safely instead of rendering NaN when the URL has a bad period param', async () => {
    renderWithProviders(<TransactionsPage />, {
      initialEntries: ['/transactions?year=abc&month=13'],
    })

    const stepper = await screen.findByText(/^[A-Za-z]{3} \d{4}$/, { selector: '.ym-nav-label' })
    expect(stepper.textContent).not.toMatch(/nan/i)
  })

  it('a period change on Budget persists to localStorage for the next page to read', async () => {
    renderWithProviders(<BudgetPage />, { initialEntries: ['/budget?year=2025&month=3'] })
    await screen.findByText(
      (content) => content.includes('2025') && content.includes('months elapsed'),
      { selector: 'p.eyebrow' }
    )

    // The stored period should now be calendar 2025/3 — Insights (no stepper
    // of its own) reads the same sticky period on its next mount. Poll: the
    // mirror deliberately waits for /auth/me so it never persists a period
    // derived from the bootstrap's guessed mode.
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PERIOD_STORAGE_KEY) ?? '{}')
      expect(stored).toEqual({ calYear: 2025, calMonth: 3 })
    })
  })

  it('both the sidenav and the bottom tab bar carry the period', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>,
      { initialEntries: ['/dashboard?year=2026&month=6'] }
    )
    await screen.findByText(/Jun 2026/)

    // "Budget" is the accessible name in both SideNav and BottomTabBar.
    const budgetLinks = screen.getAllByRole('link', { name: 'Budget' })
    expect(budgetLinks.length).toBeGreaterThanOrEqual(2)
    for (const link of budgetLinks) {
      expect(link.getAttribute('href')).toBe('/budget?year=2026&month=6')
    }
  })

  // Regression test for the "Settings picks up the sticky period in its URL"
  // defect (Phase 8c second pass): SideNav/BottomTabBar used to call the
  // owning `usePeriod()` just to build link hrefs, so its URL-backfill
  // effect fired on every route — including period-agnostic Settings — and
  // wrote `?year=&month=` onto a page that never reads those params. Fixed
  // by splitting `usePeriod` into a read-only `usePeriodValue` (used by
  // SideNav/BottomTabBar) and the owning `usePeriod` (used only by pages
  // that actually own a period route).
  it('keeps a clean URL on Settings even though SideNav/BottomTabBar read the sticky period', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/settings"
            element={
              <>
                <LocationProbe />
                <SettingsPage />
              </>
            }
          />
        </Route>
      </Routes>,
      { initialEntries: ['/settings'] }
    )

    // Give any stray effects a tick to run, then assert the URL never
    // picked up year/month params.
    await screen.findByTestId('location-search')
    expect(screen.getByTestId('location-search').textContent).toBe('')

    // Also confirm the SideNav's own "Settings" link stays plain (no query
    // string), matching its explicit `periodAware: false`.
    const settingsLinks = screen.getAllByRole('link', { name: 'Settings' })
    for (const link of settingsLinks) {
      expect(link.getAttribute('href')).toBe('/settings')
    }
  })
})
