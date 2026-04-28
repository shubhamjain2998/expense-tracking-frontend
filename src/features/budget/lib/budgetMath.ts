import type { BudgetEntry } from '@/types/budget'
import type { SummaryRow, YTDRow } from '@/types/dashboard'
import type { Category } from '@/types/settings'

import type { CategoryTableRow, HeatmapRowData, UnbudgetedCategoryRow } from '../types'

export function buildTableRows(
  entries: BudgetEntry[],
  summary: SummaryRow[],
  ytd: YTDRow[],
  overrideMap: Map<string, number>,
  month: number
): CategoryTableRow[] {
  const summaryByName = new Map(summary.map((s) => [s.category, s]))
  const ytdByName = new Map(ytd.map((y) => [y.category, y]))

  return entries.map((entry, i) => {
    const annualBudget = Number(entry.allocated_amount)
    const defaultMonthly = annualBudget / 12
    const overrideKey = `${month}:${entry.category_id}`
    const hasOverride = overrideMap.has(overrideKey)
    const monthlyBudget = hasOverride ? (overrideMap.get(overrideKey) ?? defaultMonthly) : defaultMonthly
    const s = summaryByName.get(entry.category)
    const y = ytdByName.get(entry.category)
    const thisMonthSpent = Number(s?.actual ?? 0)
    const ytdSpent = Number(y?.actual_ytd ?? 0)
    const pctUsed = monthlyBudget > 0 ? (thisMonthSpent / monthlyBudget) * 100 : null

    return {
      id: entry.id,
      categoryId: entry.category_id,
      categoryName: entry.category,
      colorIndex: i % 8,
      monthlyBudget,
      thisMonthSpent,
      ytdSpent,
      annualBudget,
      pctUsed,
      hasOverride,
    }
  })
}

export function buildHeatmapRows(
  entries: BudgetEntry[],
  monthResults: Array<{ data?: SummaryRow[] | undefined }>,
  overrideMap: Map<string, number>,
  currentYearMonth: number
): HeatmapRowData[] {
  return entries.map((entry, i) => {
    const defaultMonthly = Number(entry.allocated_amount) / 12

    const cells = Array.from({ length: 12 }, (_, mi) => {
      const m = mi + 1
      if (m > currentYearMonth) {
        return { month: m, spend: null, budget: defaultMonthly, percent: null }
      }
      const overrideKey = `${m}:${entry.category_id}`
      const budget = overrideMap.has(overrideKey)
        ? (overrideMap.get(overrideKey) ?? defaultMonthly)
        : defaultMonthly
      const row = monthResults[mi].data?.find((s) => s.category === entry.category)
      const spend = Number(row?.actual ?? 0)
      const percent = budget > 0 ? Math.round((spend / budget) * 100) : 0
      return { month: m, spend, budget, percent }
    })

    const doneMonths = cells.filter((c) => c.percent !== null)
    const avgPercent =
      doneMonths.length > 0
        ? Math.round(doneMonths.reduce((sum, c) => sum + (c.percent ?? 0), 0) / doneMonths.length)
        : null

    return {
      categoryId: entry.category_id,
      categoryName: entry.category,
      colorIndex: i % 8,
      cells,
      avgPercent,
    }
  })
}

export function buildUnbudgetedRows(
  allCategories: Category[],
  entries: BudgetEntry[],
  summary: SummaryRow[],
  ytd: YTDRow[]
): UnbudgetedCategoryRow[] {
  const budgetedIds = new Set(entries.map((e) => e.category_id))
  const summaryByName = new Map(summary.map((s) => [s.category, s]))
  const ytdByName = new Map(ytd.map((y) => [y.category, y]))

  return allCategories
    .filter((c) => !budgetedIds.has(c.id) && !c.is_income)
    .map((c, i) => ({
      categoryId: c.id,
      categoryName: c.name,
      colorIndex: (entries.length + i) % 8,
      thisMonthSpent: Number(summaryByName.get(c.name)?.actual ?? 0),
      ytdSpent: Number(ytdByName.get(c.name)?.actual_ytd ?? 0),
    }))
}
