import { useQueries } from '@tanstack/react-query'

import { getBudget, getMonthlyBudgetOverrides } from '@/lib/api/budget'
import { qk } from '@/lib/queryKeys'

import type { BudgetLookup } from '../lib/heatmap'

/**
 * Per-category-per-month allocated budget, for the "over budget" ring on
 * the heatmap (§3) and the plan line on the forecast meter (§4).
 *
 * Budgets are stored as an ANNUAL amount per category-year (`/budget/:year`)
 * with optional per-month overrides (`/budget/:year/:month/categories/:id`).
 * Reading `HeatmapCard.tsx` (src/features/budget/components/) showed this
 * resolution rule — override wins, else annual/12 — which is reimplemented
 * here rather than imported, per this phase's "don't touch budget/" rule.
 *
 * Fetches both years a trailing 12-15 month window can span (this calendar
 * year and last), via the API module directly — there's no shared hook for
 * "budget across arbitrary years" and widening one for two call sites here
 * would be a bigger surface than just calling `getBudget`/
 * `getMonthlyBudgetOverrides` (same call as the People section does for the
 * split ledger).
 */
export function useBudgetLookup(now: Date): { budgetFor: BudgetLookup; isLoading: boolean } {
  const thisYear = now.getFullYear()
  const years = [thisYear - 1, thisYear]

  const baseQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: qk.budget.byYear(year),
      queryFn: () => getBudget(year),
      // GET /budget/{year} legitimately 404s whenever the user hasn't
      // budgeted that year yet (e.g. the trailing "last year" this hook
      // always fetches, for anyone who only set up the current year) — it's
      // a valid "no budget" response, not a transient failure, so retrying
      // it 3x on every Insights load is pure wasted latency.
      retry: false,
      throwOnError: false,
    })),
  })
  const overrideQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: qk.budget.overrides(year),
      queryFn: () => getMonthlyBudgetOverrides(year),
      // GET /budget/{year}/monthly-overrides 404s until the backend ships
      // per-month overrides — react-query's default retry (3x, exponential
      // backoff) turned every Insights load into up to 8 failing requests
      // across the two years fetched here. Fail fast; `q.data ?? []` below
      // already treats "no data" as "no overrides" so behaviour is
      // unchanged, just without the retry storm.
      retry: false,
      throwOnError: false,
    })),
  })

  const isLoading = baseQueries.some((q) => q.isLoading) || overrideQueries.some((q) => q.isLoading)

  // Cheap to rebuild every render (a handful of budget entries/overrides at
  // most) — not worth a useMemo whose dependency array would just be the
  // query results themselves.
  // category -> year -> monthly amount (annual / 12)
  const base = new Map<string, Map<number, number>>()
  baseQueries.forEach((q, i) => {
    const year = years[i]
    for (const entry of q.data ?? []) {
      let byYear = base.get(entry.category)
      if (!byYear) {
        byYear = new Map()
        base.set(entry.category, byYear)
      }
      byYear.set(year, Number(entry.allocated_amount) / 12)
    }
  })

  // category -> "year-month" -> override amount
  const overrides = new Map<string, number>()
  overrideQueries.forEach((q) => {
    for (const o of q.data ?? []) {
      overrides.set(`${o.category}:${o.year}-${o.month}`, Number(o.allocated_amount))
    }
  })

  const budgetFor: BudgetLookup = (category, year, month) => {
    const overrideKey = `${category}:${year}-${month}`
    if (overrides.has(overrideKey)) return overrides.get(overrideKey) ?? 0
    return base.get(category)?.get(year) ?? 0
  }

  return { budgetFor, isLoading }
}
