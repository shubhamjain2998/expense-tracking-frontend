import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getDashboardSummary, getMonthlyTrend, getSplitLedger, getYTD } from '@/lib/api/dashboard'
import { getTags } from '@/lib/api/tags'
import { getPendingManual, getProcessedTransactions } from '@/lib/api/transactions'
import type { PeriodMode } from '@/lib/period'
import { resolvePeriodMonth } from '@/lib/period'
import { qk } from '@/lib/queryKeys'
import type { SplitLedgerRow, SummaryRow, TrendDataPoint, YTDRow } from '@/types/dashboard'
import type { Tag } from '@/types/settings'
import type { PendingManualTransaction, ProcessedTransactionItem } from '@/types/transaction'

import {
  computeCategoryStats,
  computeDailySpend,
  computeIncomeTrendData,
  computeStackedTrend,
  computeYtdExtras,
  computeYtdLineData,
} from '../lib/dashboardMath'
import type {
  CategoryStat,
  IncomeExpenseTrendPoint,
  YtdComputedData,
  YtdDataPoint,
} from '../types'

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
  dayOfMonth: number
  selectedTagId: string
  includeSettled: boolean
  mode: PeriodMode
}

export function useDashboardData({
  year,
  month,
  calYear,
  calMonth,
  dayOfMonth,
  selectedTagId,
  includeSettled,
  mode,
}: Params): DashboardDataResult {
  // ── Queries ─────────────────────────────────────────────────────────────────

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

  // The 6 calendar months ending at (and including) the selected month
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

  // Per-month summary queries — always use 'calendar' mode since year/month are calendar values
  const trendQueries = useQueries({
    queries: last6Months.map((m) => ({
      queryKey: qk.dashboard.summary(m.year, m.month, 'calendar', selectedTagId || undefined),
      queryFn: () => getDashboardSummary(m.year, m.month, selectedTagId || undefined, 'calendar'),
    })),
  })

  const incomeQueries = useQueries({
    queries: last6Months.map((m) => ({
      queryKey: qk.transactions.processed(m.year, m.month, undefined, undefined, 'calendar'),
      queryFn: () => getProcessedTransactions(m.year, m.month, undefined, undefined, 'calendar'),
    })),
  })

  // ── Derived: monthly summary ────────────────────────────────────────────────

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

  // ── Derived: income ─────────────────────────────────────────────────────────

  const allTransactions = useMemo(() => allTxnQuery.data ?? [], [allTxnQuery.data])

  const totalIncome = useMemo(
    () =>
      allTransactions
        .filter((t) => Number(t.effective_amount) < 0)
        .reduce((s, t) => s - Number(t.effective_amount), 0),
    [allTransactions]
  )

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      const amt = Number(t.effective_amount)
      if (amt < 0) map.set(t.category, (map.get(t.category) ?? 0) - amt)
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [allTransactions])

  const incomeTrendData = useMemo(
    () => computeIncomeTrendData(incomeQueries.map((q) => q.data), last6Months),
    [incomeQueries, last6Months]
  )

  // ── Derived: transaction stats + daily spend ────────────────────────────────

  const categoryStats = useMemo(() => computeCategoryStats(allTransactions), [allTransactions])
  const dailySpend = useMemo(() => computeDailySpend(allTransactions), [allTransactions])

  // ── Derived: 6-month stacked trend ─────────────────────────────────────────

  const { stackedTrendData, stackCategories } = useMemo(
    () => computeStackedTrend(trendQueries.map((q) => q.data), last6Months),
    [trendQueries, last6Months]
  )

  // ── Derived: YTD ────────────────────────────────────────────────────────────

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

  const ytdLineData = useMemo(
    () => computeYtdLineData(yearlyTrendData, annualBudget, month, mode),
    [yearlyTrendData, annualBudget, month, mode]
  )

  // Days elapsed and total days in the selected period
  const dayOfYear = useMemo(() => {
    const completedMonths = Array.from({ length: month - 1 }, (_, i) => {
      const { year: cy, month: cm } = resolvePeriodMonth(year, i + 1, mode)
      return new Date(cy, cm, 0).getDate()
    }).reduce((s, d) => s + d, 0)
    return completedMonths + dayOfMonth
  }, [year, month, mode, dayOfMonth])

  const daysInYear = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const { year: cy, month: cm } = resolvePeriodMonth(year, i + 1, mode)
      return new Date(cy, cm, 0).getDate()
    }).reduce((s, d) => s + d, 0)
  }, [year, mode])

  const projectedFY = useMemo(
    () =>
      ytdSpentTotal > 0 && dayOfYear > 0
        ? Math.round((ytdSpentTotal / dayOfYear) * daysInYear)
        : 0,
    [ytdSpentTotal, dayOfYear, daysInYear]
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
        month,
        projectedFY,
        expectedYtd,
      }),
    [ytdRows, yearlyTrendData, ytdSpentTotal, month, projectedFY, expectedYtd]
  )

  // ── Return ──────────────────────────────────────────────────────────────────

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
    summaryLoading: summaryQuery.isLoading,
    allTxnLoading: allTxnQuery.isLoading,
    ledgerLoading: ledgerQuery.isLoading,
    ytdLoading: ytdQuery.isLoading,
    pendingLoading: pendingQuery.isLoading,
    yearlyTrendLoading: yearlyTrendQuery.isLoading,
    trendQueriesLoading: trendQueries.some((q) => q.isLoading),
    incomeQueriesLoading: incomeQueries.some((q) => q.isLoading),
  }
}
