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

import type { PeriodMode } from './period'

export const qk = {
  auth: {
    all: ['auth'] as const,
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
