import type { BudgetEntry } from '@/types/budget'
import type { SummaryRow, YTDRow } from '@/types/dashboard'
import type { Category } from '@/types/settings'

import type { CategoryTableRow, HeatmapRowData, UnbudgetedCategoryRow } from '../types'

// Backend stores allocated_amount as ANNUAL; UI shows/edits MONTHLY values.
export const monthlyToAnnual = (m: number): number => m * 12
export const annualToMonthly = (a: number): number => a / 12

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
    const defaultMonthly = annualToMonthly(annualBudget)
    const overrideKey = `${month}:${entry.category_id}`
    const hasOverride = overrideMap.has(overrideKey)
    const monthlyBudget = hasOverride
      ? (overrideMap.get(overrideKey) ?? defaultMonthly)
      : defaultMonthly
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

export interface HeatmapInputRow {
  categoryId: string
  categoryName: string
  // 0 when no budget is set — yields empty cells (percent: null) so users with
  // no budget yet still see all categories laid out in the grid.
  annualBudget: number
}

export function buildHeatmapRows(
  rows: HeatmapInputRow[],
  monthResults: Array<{ data?: SummaryRow[] | undefined }>,
  overrideMap: Map<string, number>,
  currentYearMonth: number
): HeatmapRowData[] {
  return rows.map((row, i) => {
    const defaultMonthly = annualToMonthly(row.annualBudget)

    const cells = Array.from({ length: 12 }, (_, mi) => {
      const m = mi + 1
      if (m > currentYearMonth) {
        return { month: m, spend: null, budget: defaultMonthly, percent: null }
      }
      const overrideKey = `${m}:${row.categoryId}`
      const budget = overrideMap.has(overrideKey)
        ? (overrideMap.get(overrideKey) ?? defaultMonthly)
        : defaultMonthly
      const monthRow = monthResults[mi].data?.find((s) => s.category === row.categoryName)
      const spend = Number(monthRow?.actual ?? 0)
      const percent = budget > 0 ? Math.round((spend / budget) * 100) : null
      return { month: m, spend, budget, percent }
    })

    const doneMonths = cells.filter((c) => c.percent !== null)
    const avgPercent =
      doneMonths.length > 0
        ? Math.round(doneMonths.reduce((sum, c) => sum + (c.percent ?? 0), 0) / doneMonths.length)
        : null

    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
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
