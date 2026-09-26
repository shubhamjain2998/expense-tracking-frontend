import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getBudget } from '@/lib/api/budget'
import { getCategories } from '@/lib/api/categories'
import { getDashboardSummary, getYTD } from '@/lib/api/dashboard'
import { getProcessedTransactions } from '@/lib/api/transactions'
import { getCurrentPeriod } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'
import { qk } from '@/lib/queryKeys'
import type { SummaryRow, YTDRow } from '@/types/dashboard'

import {
  buildHeatmapRows,
  buildIncomeRows,
  buildTableRows,
  buildUnbudgetedRows,
  buildYearVerdict,
} from '../lib/budgetMath'
import type {
  CategoryTableRow,
  HeatmapRowData,
  IncomeTableRow,
  UnbudgetedCategoryRow,
  YearVerdict,
} from '../types'

const NO_ENTRIES: BudgetDataResult['entries'] = []
const NO_SUMMARY: SummaryRow[] = []
const NO_YTD: YTDRow[] = []
const NO_CATEGORIES: BudgetDataResult['allCategories'] = []

export interface BudgetDataResult {
  isLoading: boolean
  entries: ReturnType<typeof getBudget> extends Promise<infer T> ? T : never
  allCategories: Awaited<ReturnType<typeof getCategories>>
  tableData: CategoryTableRow[]
  heatmapData: HeatmapRowData[]
  unbudgetedData: UnbudgetedCategoryRow[]
  incomeTableData: IncomeTableRow[]
  totalAnnual: number
  totalMonthlyBudget: number
  totalThisMonth: number
  totalYTDSpent: number
  totalPct: number | null
  paceStatus: 'under' | 'over' | 'on_track' | null
  /** Months of this financial/calendar year elapsed as of today (0-12). */
  monthsElapsed: number
  yearVerdict: YearVerdict
}

export function useBudgetData({
  year,
  month,
  mode,
}: {
  year: number
  month: number
  mode: PeriodMode
}) {
  const budgetQuery = useQuery({
    queryKey: qk.budget.byYear(year),
    queryFn: () => getBudget(year),
    // GET /budget/{year} legitimately 404s for a year with no budget plan
    // yet (e.g. a brand-new year, or before onboarding creates the first
    // entry) — retrying 3x just delays `isLoading` settling to false and
    // leaves the skeleton on screen longer than the empty state needs.
    retry: false,
    throwOnError: false,
  })

  const summaryQuery = useQuery({
    queryKey: qk.dashboard.summary(year, month, mode),
    queryFn: () => getDashboardSummary(year, month, undefined, mode),
  })

  const ytdQuery = useQuery({
    queryKey: qk.dashboard.ytd(year, mode),
    queryFn: () => getYTD(year, mode),
  })

  const categoriesQuery = useQuery({
    queryKey: qk.categories.all,
    queryFn: getCategories,
  })

  // GET /dashboard/summary excludes income server-side (it filters to
  // expense/refund), so the "Expected income" table's "Received this
  // month" column can't be sourced from `summaryQuery` — it would always
  // read 0. Mirror Home's `useDashboardData.incomeByCategory`: fetch the
  // month's processed transactions and sum txn_type === 'income' rows per
  // category. Shares a cache entry with Home/Transactions for this month.
  const monthTxnQuery = useQuery({
    queryKey: qk.transactions.processed(year, month, undefined, undefined, mode),
    queryFn: () => getProcessedTransactions(year, month, undefined, undefined, mode),
  })

  const now = new Date()
  const todayPeriod = getCurrentPeriod(mode, now)
  const currentYearMonth =
    year === todayPeriod.year ? todayPeriod.month : year < todayPeriod.year ? 12 : 0

  const monthQueries = useQueries({
    queries: Array.from({ length: 12 }, (_, i) => ({
      queryKey: qk.dashboard.summary(year, i + 1, mode),
      queryFn: () => getDashboardSummary(year, i + 1, undefined, mode),
      enabled: i + 1 <= currentYearMonth,
      staleTime: 5 * 60 * 1000,
    })),
  })

  // Module-level fallbacks, never `?? []` inline: a fresh empty array each
  // render breaks every memo below while a query has no data (a year with no
  // budget 404s and stays that way), and the Budget world keys its rise-in on
  // those memos — so each hover re-render replayed the animation.
  const entries = budgetQuery.data ?? NO_ENTRIES
  const summary = summaryQuery.data ?? NO_SUMMARY
  const ytd = ytdQuery.data ?? NO_YTD
  const allCategories = categoriesQuery.data ?? NO_CATEGORIES

  const tableData = useMemo(() => buildTableRows(entries, summary, ytd), [entries, summary, ytd])

  const heatmapData = useMemo(() => {
    // With no budget entries yet, fall back to listing all expense categories
    // with annualBudget=0 — buildHeatmapRows returns empty (null-percent) cells
    // for them so the grid is still visible instead of a bare empty state.
    const rows =
      entries.length > 0
        ? entries.map((e) => ({
            categoryId: e.category_id,
            categoryName: e.category,
            annualBudget: Number(e.allocated_amount),
          }))
        : allCategories
            .filter((c) => !c.is_income)
            .map((c) => ({ categoryId: c.id, categoryName: c.name, annualBudget: 0 }))
    return buildHeatmapRows(rows, monthQueries, currentYearMonth)
  }, [entries, allCategories, monthQueries, currentYearMonth])

  const unbudgetedData = useMemo(
    () => buildUnbudgetedRows(allCategories, entries, summary, ytd),
    [allCategories, entries, summary, ytd]
  )

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTxnQuery.data ?? []) {
      if (t.txn_type !== 'income') continue
      const amt = Math.abs(Number(t.effective_amount))
      map.set(t.category, (map.get(t.category) ?? 0) + amt)
    }
    return Array.from(map.entries()).map(([category, total]) => ({ category, total }))
  }, [monthTxnQuery.data])

  // Not memoized — a cheap map, and wrapping it in useMemo would only add
  // another react-hooks/exhaustive-deps warning on the `?? []` fallbacks
  // above (same as every other derived value in this hook).
  const incomeTableData = buildIncomeRows(allCategories, entries, incomeByCategory, ytd)

  const totalAnnual = entries.reduce((s, e) => s + Number(e.allocated_amount), 0)
  const totalMonthlyBudget = tableData.reduce((s, r) => s + r.monthlyBudget, 0)
  const totalThisMonth = tableData.reduce((s, r) => s + r.thisMonthSpent, 0)
  const totalYTDSpent = tableData.reduce((s, r) => s + r.ytdSpent, 0)
  const totalPct = totalMonthlyBudget > 0 ? (totalThisMonth / totalMonthlyBudget) * 100 : null

  const expectedYTD = (totalAnnual / 12) * currentYearMonth
  const paceStatus: 'under' | 'over' | 'on_track' | null =
    totalAnnual === 0
      ? null
      : totalYTDSpent < expectedYTD * 0.97
        ? 'under'
        : totalYTDSpent > expectedYTD * 1.03
          ? 'over'
          : 'on_track'

  const isLoading =
    budgetQuery.isLoading || summaryQuery.isLoading || ytdQuery.isLoading || monthTxnQuery.isLoading

  const yearVerdict = buildYearVerdict(totalYTDSpent, totalAnnual, currentYearMonth)

  return {
    isLoading,
    entries,
    allCategories,
    tableData,
    heatmapData,
    unbudgetedData,
    incomeTableData,
    totalAnnual,
    totalMonthlyBudget,
    totalThisMonth,
    totalYTDSpent,
    totalPct,
    paceStatus,
    monthsElapsed: currentYearMonth,
    yearVerdict,
  }
}
