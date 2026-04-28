import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getBudget, getMonthlyBudgetOverrides } from '@/lib/api/budget'
import { getCategories } from '@/lib/api/categories'
import { getDashboardSummary, getYTD } from '@/lib/api/dashboard'
import { getCurrentPeriod } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

import { buildHeatmapRows, buildTableRows, buildUnbudgetedRows } from '../lib/budgetMath'
import type { CategoryTableRow, HeatmapRowData, UnbudgetedCategoryRow } from '../types'

export interface BudgetDataResult {
  isLoading: boolean
  entries: ReturnType<typeof getBudget> extends Promise<infer T> ? T : never
  allCategories: Awaited<ReturnType<typeof getCategories>>
  tableData: CategoryTableRow[]
  heatmapData: HeatmapRowData[]
  unbudgetedData: UnbudgetedCategoryRow[]
  totalAnnual: number
  totalMonthlyBudget: number
  totalThisMonth: number
  totalYTDSpent: number
  totalPct: number | null
  paceStatus: 'under' | 'over' | 'on_track' | null
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

  const overridesQuery = useQuery({
    queryKey: qk.budget.overrides(year),
    queryFn: () => getMonthlyBudgetOverrides(year),
    retry: false,
    throwOnError: false,
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

  const entries = budgetQuery.data ?? []
  const summary = summaryQuery.data ?? []
  const ytd = ytdQuery.data ?? []
  const allCategories = categoriesQuery.data ?? []
  const overrides = overridesQuery.data ?? []

  const overrideMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of overrides) {
      map.set(`${o.month}:${o.category_id}`, o.allocated_amount)
    }
    return map
  }, [overrides])

  const tableData = useMemo(
    () => buildTableRows(entries, summary, ytd, overrideMap, month),
    [entries, summary, ytd, overrideMap, month]
  )

  const heatmapData = useMemo(
    () => buildHeatmapRows(entries, monthQueries, overrideMap, currentYearMonth),
    [entries, monthQueries, overrideMap, currentYearMonth]
  )

  const unbudgetedData = useMemo(
    () => buildUnbudgetedRows(allCategories, entries, summary, ytd),
    [allCategories, entries, summary, ytd]
  )

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

  const isLoading = budgetQuery.isLoading || summaryQuery.isLoading || ytdQuery.isLoading

  return {
    isLoading,
    entries,
    allCategories,
    tableData,
    heatmapData,
    unbudgetedData,
    totalAnnual,
    totalMonthlyBudget,
    totalThisMonth,
    totalYTDSpent,
    totalPct,
    paceStatus,
  }
}
