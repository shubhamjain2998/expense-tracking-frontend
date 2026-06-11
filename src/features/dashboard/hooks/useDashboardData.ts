import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  getDashboardSummary,
  getMonthlyTrend,
  getMultiMonthSummary,
  getSplitLedger,
  getYTD,
} from '@/lib/api/dashboard'
import { getTags } from '@/lib/api/tags'
import { getPendingManual, getProcessedTransactions } from '@/lib/api/transactions'
import type { PeriodMode } from '@/lib/period'
import { getCurrentPeriod, resolvePeriodMonth } from '@/lib/period'
import { qk } from '@/lib/queryKeys'
import type { SplitLedgerRow, SummaryRow, TrendDataPoint, YTDRow } from '@/types/dashboard'
import type { Tag } from '@/types/settings'
import type { PendingManualTransaction, ProcessedTransactionItem } from '@/types/transaction'

import {
  computeCategoryStats,
  computeDailySpend,
  computeLastActiveMonthHint,
  computeStackedTrend,
  computeYtdExtras,
  computeYtdLineData,
} from '../lib/dashboardMath'
import type {
  CategoryStat,
  IncomeExpenseTrendPoint,
  LastActiveMonthHint,
  YtdComputedData,
  YtdDataPoint,
} from '../types'

export type { LastActiveMonthHint }

export interface DashboardDataResult {
  // Monthly summary
  summaryRows: SummaryRow[]
  totalDebit: number
  totalBudget: number
  budgetRows: SummaryRow[]
  categoryChartData: { name: string; value: number }[]

  // Income
  totalIncome: number
  incomeByCategory: { category: string; total: number }[]
  incomeTrendData: IncomeExpenseTrendPoint[]

  // Transactions
  allTransactions: ProcessedTransactionItem[]
  categoryStats: CategoryStat[]
  dailySpend: Map<number, number>

  // 6-month stacked trend
  stackedTrendData: Record<string, number | string>[]
  stackCategories: string[]

  // Tags / ledger / pending
  tags: Tag[]
  ledger: SplitLedgerRow[]
  pendingItems: PendingManualTransaction[]

  // YTD
  ytdRows: YTDRow[]
  ytdSpentTotal: number
  annualBudget: number
  projectedFY: number
  expectedYtd: number
  ytdLineData: YtdDataPoint[]
  yearlyTrendData: TrendDataPoint[]
  ytdComputed: YtdComputedData
  /** Months elapsed in the selected FY *as of today* — drives YTD labels
   *  and projection math (not the picker's selected month). */
  monthsElapsedYtd: number

  /**
   * Set when the selected month has zero spend but other months in the
   * multi-month window do have activity. Used to render the empty-month
   * hero hint. Null when the selected month has spend or no prior data
   * is available.
   */
  lastActiveMonthHint: LastActiveMonthHint | null

  // Per-query loading flags
  summaryLoading: boolean
  allTxnLoading: boolean
  ledgerLoading: boolean
  ytdLoading: boolean
  pendingLoading: boolean
  yearlyTrendLoading: boolean
  trendQueriesLoading: boolean
  incomeQueriesLoading: boolean
}

interface Params {
  year: number
  month: number
  calYear: number
  calMonth: number
  selectedTagId: string
  includeSettled: boolean
  mode: PeriodMode
  trendWindow: number
}

export function useDashboardData({
  year,
  month,
  calYear,
  calMonth,
  selectedTagId,
  includeSettled,
  mode,
  trendWindow,
}: Params): DashboardDataResult {
  // ── Queries ──────────────────────────────────────────────────────────────────────

  const summaryQuery = useQuery({
    queryKey: qk.dashboard.summary(year, month, mode, selectedTagId || undefined),
    queryFn: () => getDashboardSummary(year, month, selectedTagId || undefined, mode),
  })

  const ledgerQuery = useQuery({
    queryKey: qk.dashboard.splitLedger(year, month, includeSettled, mode),
    queryFn: () => getSplitLedger(year, month, includeSettled, mode),
  })

  const ytdQuery = useQuery({
    queryKey: qk.dashboard.ytd(year, mode),
    queryFn: () => getYTD(year, mode),
  })

  const tagsQuery = useQuery({
    queryKey: qk.tags.all,
    queryFn: getTags,
  })

  const allTxnQuery = useQuery({
    queryKey: qk.transactions.processed(year, month, undefined, undefined, mode),
    queryFn: () => getProcessedTransactions(year, month, undefined, undefined, mode),
  })

  const pendingQuery = useQuery({
    queryKey: qk.transactions.pendingManual(),
    queryFn: getPendingManual,
    staleTime: 60_000,
  })

  const yearlyTrendQuery = useQuery({
    queryKey: qk.dashboard.monthlyTrend(year, mode),
    queryFn: () => getMonthlyTrend(year, undefined, undefined, mode),
  })

  // Single batch call replaces 6×summary + 6×transactions/processed (finding 1.3).
  // Returns per-category expense + income/expense totals for the 6 calendar months
  // ending at the currently selected calendar month. Always 6 — used by the
  // stacked category trend which is intentionally fixed-width.
  const multiMonthSummaryQuery = useQuery({
    queryKey: qk.dashboard.multiMonthSummary(calYear, calMonth, 6, selectedTagId || undefined),
    queryFn: () => getMultiMonthSummary(calYear, calMonth, 6, selectedTagId || undefined),
  })

  // Separate query for the income/expense trend — window is user-controlled (3/6/12/24).
  // When trendWindow===6 the query key matches multiMonthSummaryQuery's key exactly, so
  // React Query deduplicates the request and reuses the cached result for free.
  const incomeWindowQuery = useQuery({
    queryKey: qk.dashboard.multiMonthSummary(
      calYear,
      calMonth,
      trendWindow,
      selectedTagId || undefined
    ),
    queryFn: () => getMultiMonthSummary(calYear, calMonth, trendWindow, selectedTagId || undefined),
  })

  // The 6 calendar months ending at (and including) the selected month (for stacked trend)
  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(calYear, calMonth - 1 - i, 1)
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('en-US', { month: 'short' }),
      }
    }).reverse()
  }, [calYear, calMonth])

  // The N calendar months for the income/expense trend window
  const trendMonths = useMemo(() => {
    return Array.from({ length: trendWindow }, (_, i) => {
      const d = new Date(calYear, calMonth - 1 - i, 1)
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('en-US', { month: 'short' }),
      }
    }).reverse()
  }, [calYear, calMonth, trendWindow])

  // ── Derived: monthly summary ─────────────────────────────────────────────────────────

  const summaryRows = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data])

  const totalDebit = useMemo(
    () => summaryRows.filter((r) => Number(r.actual) > 0).reduce((s, r) => s + Number(r.actual), 0),
    [summaryRows]
  )

  const totalBudget = useMemo(
    () => summaryRows.reduce((s, r) => s + Number(r.allocated_monthly), 0),
    [summaryRows]
  )

  const budgetRows = useMemo(
    () =>
      [...summaryRows]
        .filter((r) => Number(r.actual) > 0 || Number(r.allocated_monthly) > 0)
        .sort((a, b) => {
          const pctA =
            Number(a.allocated_monthly) > 0 ? Number(a.actual) / Number(a.allocated_monthly) : 0
          const pctB =
            Number(b.allocated_monthly) > 0 ? Number(b.actual) / Number(b.allocated_monthly) : 0
          return pctB - pctA
        }),
    [summaryRows]
  )

  const categoryChartData = useMemo(
    () =>
      summaryRows
        .filter((r) => Number(r.actual) > 0)
        .map((r) => ({ name: r.category, value: Number(r.actual) }))
        .sort((a, b) => b.value - a.value),
    [summaryRows]
  )

  // ── Derived: income ────────────────────────────────────────────────────────────────

  const allTransactions = useMemo(() => allTxnQuery.data ?? [], [allTxnQuery.data])

  // Income = strictly txn_type === 'income'. Don't fall back to amount sign:
  // backend's classify_txn_type maps negatives to refund/transfer, so a sign
  // check would double-count refunds and credit-card payments as income.
  // Matches the income_total the multi-month-summary endpoint computes.
  const totalIncome = useMemo(
    () =>
      allTransactions
        .filter((t) => t.txn_type === 'income')
        .reduce((s, t) => s + Math.abs(Number(t.effective_amount)), 0),
    [allTransactions]
  )

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      if (t.txn_type !== 'income') continue
      const amt = Math.abs(Number(t.effective_amount))
      map.set(t.category, (map.get(t.category) ?? 0) + amt)
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [allTransactions])

  // Income/expense trend — driven by the user-selected window (3/6/12/24 months).
  const incomeTrendData = useMemo((): IncomeExpenseTrendPoint[] => {
    const items = incomeWindowQuery.data ?? []
    return trendMonths.map((m) => {
      const item = items.find((d) => d.year === m.year && d.month === m.month)
      const income = item ? Number(item.income_total) : 0
      const expense = item ? Number(item.expense_total) : 0
      return { month: m.label, income, expense, savings: income - expense }
    })
  }, [incomeWindowQuery.data, trendMonths])

  // ── Derived: transaction stats + daily spend ─────────────────────────────────

  const categoryStats = useMemo(() => computeCategoryStats(allTransactions), [allTransactions])
  const dailySpend = useMemo(() => computeDailySpend(allTransactions), [allTransactions])

  // ── Derived: last-active-month hint (for empty months) ───────────────────────

  const lastActiveMonthHint = useMemo(
    () =>
      computeLastActiveMonthHint(totalDebit, multiMonthSummaryQuery.data ?? [], calYear, calMonth),
    [totalDebit, multiMonthSummaryQuery.data, calYear, calMonth]
  )

  // ── Derived: 6-month stacked trend ──────────────────────────────────────────

  const { stackedTrendData, stackCategories } = useMemo(
    () =>
      computeStackedTrend(
        multiMonthSummaryQuery.data
          ? multiMonthSummaryQuery.data.map((item) => item.category_breakdown)
          : last6Months.map(() => undefined),
        last6Months
      ),
    [multiMonthSummaryQuery.data, last6Months]
  )

  // ── Derived: YTD ──────────────────────────────────────────────────────────────────────

  const ytdRows = useMemo(() => ytdQuery.data ?? [], [ytdQuery.data])
  const ytdSpentTotal = useMemo(
    () => ytdRows.reduce((s, r) => s + Math.max(0, r.actual_ytd), 0),
    [ytdRows]
  )
  const annualBudget = useMemo(
    () => ytdRows.reduce((s, r) => s + Math.max(0, r.allocated_ytd), 0),
    [ytdRows]
  )

  const yearlyTrendData = useMemo(() => yearlyTrendQuery.data ?? [], [yearlyTrendQuery.data])

  // YTD position — independent of the month the user has selected in the
  // picker. The backend's YTD endpoint returns spend-through-today within
  // the selected FY; projections must use today's days elapsed (not the
  // selected month's) or a single low-data month inflates the extrapolation.
  //
  // Cases:
  //  • Selected FY is in the past   → dayOfYear = full FY length (complete year)
  //  • Selected FY is current       → dayOfYear = days from FY start to today
  //  • Selected FY is in the future → dayOfYear = 0 (no data, no projection)
  const now = useMemo(() => new Date(), [])
  const { year: currentFyYear, month: currentFyMonth } = useMemo(
    () => getCurrentPeriod(mode, now),
    [mode, now]
  )

  const daysInYear = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const { year: cy, month: cm } = resolvePeriodMonth(year, i + 1, mode)
      return new Date(cy, cm, 0).getDate()
    }).reduce((s, d) => s + d, 0)
  }, [year, mode])

  const dayOfYear = useMemo(() => {
    if (year < currentFyYear) return daysInYear
    if (year > currentFyYear) return 0
    // Current FY: sum completed periodMonths + today's day-of-current-month
    const completedDays = Array.from({ length: currentFyMonth - 1 }, (_, i) => {
      const { year: cy, month: cm } = resolvePeriodMonth(year, i + 1, mode)
      return new Date(cy, cm, 0).getDate()
    }).reduce((s, d) => s + d, 0)
    return completedDays + now.getDate()
  }, [year, mode, currentFyYear, currentFyMonth, daysInYear, now])

  // Months elapsed in the selected FY *as of today*. Used by the YTD section
  // for the "X months elapsed" label and for projectedFYIncome math.
  const monthsElapsedYtd = useMemo(() => {
    if (year < currentFyYear) return 12
    if (year > currentFyYear) return 0
    return currentFyMonth
  }, [year, currentFyYear, currentFyMonth])

  const projectedFY = useMemo(
    () =>
      ytdSpentTotal > 0 && dayOfYear > 0 ? Math.round((ytdSpentTotal / dayOfYear) * daysInYear) : 0,
    [ytdSpentTotal, dayOfYear, daysInYear]
  )

  const ytdLineData = useMemo(
    () => computeYtdLineData(yearlyTrendData, annualBudget, monthsElapsedYtd, mode),
    [yearlyTrendData, annualBudget, monthsElapsedYtd, mode]
  )

  const expectedYtd = useMemo(
    () => (annualBudget > 0 ? Math.round((annualBudget * dayOfYear) / daysInYear) : 0),
    [annualBudget, dayOfYear, daysInYear]
  )

  const ytdComputed = useMemo(
    () =>
      computeYtdExtras({
        ytdRows,
        yearlyTrendData,
        ytdSpentTotal,
        month: monthsElapsedYtd,
        projectedFY,
        expectedYtd,
      }),
    [ytdRows, yearlyTrendData, ytdSpentTotal, monthsElapsedYtd, projectedFY, expectedYtd]
  )

  // ── Return ────────────────────────────────────────────────────────────────────────

  return {
    summaryRows,
    totalDebit,
    totalBudget,
    budgetRows,
    categoryChartData,
    totalIncome,
    incomeByCategory,
    incomeTrendData,
    allTransactions,
    categoryStats,
    dailySpend,
    stackedTrendData,
    stackCategories,
    lastActiveMonthHint,
    tags: tagsQuery.data ?? [],
    ledger: ledgerQuery.data ?? [],
    pendingItems: pendingQuery.data ?? [],
    ytdRows,
    ytdSpentTotal,
    annualBudget,
    projectedFY,
    expectedYtd,
    ytdLineData,
    yearlyTrendData,
    ytdComputed,
    monthsElapsedYtd,
    summaryLoading: summaryQuery.isLoading,
    allTxnLoading: allTxnQuery.isLoading,
    ledgerLoading: ledgerQuery.isLoading,
    ytdLoading: ytdQuery.isLoading,
    pendingLoading: pendingQuery.isLoading,
    yearlyTrendLoading: yearlyTrendQuery.isLoading,
    trendQueriesLoading: multiMonthSummaryQuery.isLoading,
    incomeQueriesLoading: incomeWindowQuery.isLoading,
  }
}
