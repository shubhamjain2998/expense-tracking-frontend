/**
 * Regression test for the 404 retry storm on the budget-year lookup, and for
 * the per-month-override lookup, which the page no longer makes (Sep 2026:
 * plans are annual; the backend never had that route).
 *
 * Bug: `GET /budget/{year}` legitimately 404s for a year with no budget
 * plan yet, and `GET /budget/{year}/monthly-overrides` 404s because that
 * route has never existed on the backend. Neither query had
 * `retry: false`, so react-query's default retry (3x, exponential backoff)
 * turned one failing request into up to 4 — multiplied further on
 * Insights (`useBudgetLookup`), which fires both for two years at once.
 *
 * Fixed by adding `retry: false, throwOnError: false` to every call site
 * (`useBudgetData.ts`, `useBudgetLookup.ts` x2, `category/page.tsx` x2),
 * matching the one call site that already had it right.
 *
 * This test covers the `BudgetPage` → `useBudgetData` call site directly
 * (rendered here); `useBudgetLookup` and the category page's queries got
 * the identical fix and were confirmed live via the Network tab during the
 * sweep (see docs/ledger-sweep-findings.md) rather than duplicated here.
 */
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { BudgetPage } from '@/pages/BudgetPage'

import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

describe('Budget 404 endpoints do not retry-storm', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('fetches GET /budget/:year exactly once on a 404, and never asks for per-month overrides', async () => {
    let budgetCallCount = 0
    let overridesCallCount = 0

    server.use(
      http.get('http://localhost:8000/budget/:year', () => {
        budgetCallCount++
        return new HttpResponse(null, { status: 404 })
      }),
      http.get('http://localhost:8000/budget/:year/monthly-overrides', () => {
        overridesCallCount++
        return new HttpResponse(null, { status: 404 })
      })
    )

    renderWithProviders(<BudgetPage />, { initialEntries: ['/budget?year=2025&month=3'] })

    // The page settles into its "no budget" empty state instead of hanging
    // on the loading skeleton for the length of a retry backoff. 2025 is not
    // the current year, so that is the header's "No plan set" line, not the
    // first-time setup card.
    expect(await screen.findByText(/no plan set/i)).toBeInTheDocument()

    // Give any (incorrect) retry a moment to have fired if `retry: false`
    // regressed — react-query's first retry backs off ~1s, well inside a
    // typical test timeout, so a real regression would show up here.
    await waitFor(() => {
      expect(budgetCallCount).toBeGreaterThanOrEqual(1)
    })

    expect(budgetCallCount).toBe(1)
    // The override route never existed on the backend; the page no longer
    // asks for it at all.
    expect(overridesCallCount).toBe(0)
  })
})
