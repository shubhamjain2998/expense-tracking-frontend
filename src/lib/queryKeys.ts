/**
 * Typed React Query key factory.
 *
 * Centralizing keys avoids the kebab-case / camelCase drift that built up
 * across pages (e.g. `dashboard-summary` vs `dashboardSummary`) and ensures
 * invalidation hits the right caches.
 *
 * Convention: every factory returns a `readonly` tuple. Use partial keys for
 * broader invalidation — `qk.budget.all` invalidates all year-scoped budgets.
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query'

import type { PeriodMode } from './period'

export const qk = {
  auth: {
    all: ['auth'] as const,
    me: ['auth', 'me'] as const,
  },
  persons: {
    all: ['persons'] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  tags: {
    all: ['tags'] as const,
  },
  categoryMappings: {
    all: ['categoryMappings'] as const,
  },
  budget: {
    all: ['budget'] as const,
    byYear: (year: number) => ['budget', year] as const,
    overrides: (year: number) => ['budgetOverrides', year] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (year: number, month: number, mode?: PeriodMode, tagId?: string) =>
      ['dashboard', 'summary', year, month, mode, tagId] as const,
    monthlyTrend: (year: number, mode?: PeriodMode, categoryId?: string, tagId?: string) =>
      ['dashboard', 'monthlyTrend', year, mode, categoryId, tagId] as const,
    splitLedger: (year: number, month: number, includeSettled: boolean, mode?: PeriodMode) =>
      ['dashboard', 'splitLedger', year, month, includeSettled, mode] as const,
    ytd: (year: number, mode?: PeriodMode) => ['dashboard', 'ytd', year, mode] as const,
    multiMonthSummary: (endYear: number, endMonth: number, months: number, tagId?: string) =>
      ['dashboard', 'multiMonthSummary', endYear, endMonth, months, tagId] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    raw: (year: number, month: number, mode?: PeriodMode) =>
      ['transactions', 'raw', year, month, mode] as const,
    processed: (
      year: number,
      month: number,
      categoryId?: string,
      tagId?: string,
      mode?: PeriodMode
    ) => ['transactions', 'processed', year, month, categoryId, tagId, mode] as const,
    processedAll: () => ['transactions', 'processedAll'] as const,
    pendingManual: () => ['transactions', 'pendingManual'] as const,
  },
} as const

/**
 * Maps a logical data domain to every top-level query key that holds data
 * from that domain. Use with `invalidateDomains` so callers don't have to
 * remember that, e.g., `budget` lives under two unrelated prefixes
 * (`['budget', ...]` AND `['budgetOverrides', ...]`).
 *
 * Add new domains here when introducing a new top-level cache.
 */
const domainKeys = {
  auth: [qk.auth.all],
  persons: [qk.persons.all],
  categories: [qk.categories.all],
  tags: [qk.tags.all],
  categoryMappings: [qk.categoryMappings.all],
  budget: [qk.budget.all, ['budgetOverrides']],
  dashboard: [qk.dashboard.all],
  transactions: [qk.transactions.all],
} satisfies Record<string, readonly QueryKey[]>

export type QueryDomain = keyof typeof domainKeys

/**
 * Invalidate every query under each of the given domains. Active queries
 * refetch immediately; inactive queries are marked stale and refetch on
 * next mount. Prefer this over hand-rolling `invalidateQueries` calls so
 * cross-domain effects (e.g. deleting a category also touches transactions
 * and the dashboard) aren't forgotten at one call site.
 */
export function invalidateDomains(qc: QueryClient, domains: readonly QueryDomain[]): void {
  for (const domain of domains) {
    for (const key of domainKeys[domain]) {
      void qc.invalidateQueries({ queryKey: key })
    }
  }
}

/**
 * Hard-reset the entire query cache. Use for "Delete everything" wipes
 * and for logout — plain invalidation leaves the stale rows in memory
 * and they can briefly render before the refetch resolves.
 */
export function clearAllQueries(qc: QueryClient): void {
  qc.clear()
}
