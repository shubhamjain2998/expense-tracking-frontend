import type { BudgetEntry } from '@/types/budget'
import type { SummaryRow, YTDRow } from '@/types/dashboard'
import type { Category } from '@/types/settings'

import type {
  CategoryTableRow,
  HeatmapRowData,
  IncomeTableRow,
  UnbudgetedCategoryRow,
  YearVerdict,
} from '../types'

// Backend stores allocated_amount as ANNUAL; UI shows/edits MONTHLY values.
export const monthlyToAnnual = (m: number): number => m * 12
export const annualToMonthly = (a: number): number => a / 12

export function buildTableRows(
  entries: BudgetEntry[],
  summary: SummaryRow[],
  ytd: YTDRow[]
): CategoryTableRow[] {
  const summaryByName = new Map(summary.map((s) => [s.category, s]))
  const ytdByName = new Map(ytd.map((y) => [y.category, y]))

  return entries.map((entry, i) => {
    const annualBudget = Number(entry.allocated_amount)
    const monthlyBudget = annualToMonthly(annualBudget)
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
  currentYearMonth: number
): HeatmapRowData[] {
  return rows.map((row, i) => {
    const budget = annualToMonthly(row.annualBudget)

    const cells = Array.from({ length: 12 }, (_, mi) => {
      const m = mi + 1
      if (m > currentYearMonth) {
        return { month: m, spend: null, budget, percent: null }
      }
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
      txnCount: c.txn_count ?? 0,
    }))
}

/**
 * Expected income table rows (Budget §4). Income categories never get a
 * budget entry through the UI (AddBudgetModal excludes them), so `perMonth`
 * only appears when one exists anyway (e.g. seeded via backup import).
 * `actual_ytd` is stored negative for income rows — abs() it for display,
 * matching the YTD income-breakdown convention.
 *
 * `receivedThisMonth` deliberately does NOT come from `GET
 * /dashboard/summary` — that endpoint filters to
 * `txn_type in (expense, refund)` server-side (backend/app/routers/
 * dashboard.py), so income categories are never present in it and a
 * summary-based lookup always falls through to 0. Callers must pass the
 * same per-category income totals Home derives from the month's processed
 * transactions (`useDashboardData.incomeByCategory`: txn_type === 'income',
 * abs(effective_amount)) instead.
 */
export function buildIncomeRows(
  allCategories: Category[],
  entries: BudgetEntry[],
  incomeByCategory: { category: string; total: number }[],
  ytd: YTDRow[]
): IncomeTableRow[] {
  const entryByCategory = new Map(entries.map((e) => [e.category_id, e]))
  const incomeByCategoryName = new Map(incomeByCategory.map((i) => [i.category, i.total]))
  const ytdByName = new Map(ytd.map((y) => [y.category, y]))

  return allCategories
    .filter((c) => c.is_income)
    .map((c) => {
      const entry = entryByCategory.get(c.id)
      return {
        categoryId: c.id,
        categoryName: c.name,
        perMonth: entry ? annualToMonthly(Number(entry.allocated_amount)) : null,
        receivedThisMonth: Math.abs(Number(incomeByCategoryName.get(c.name) ?? 0)),
        ytdReceived: Math.abs(Number(ytdByName.get(c.name)?.actual_ytd ?? 0)),
      }
    })
}

/**
 * Budget §1 "The year" verdict — the only place annual/YTD figures appear
 * anywhere in the app (MASTER.md §1, "one number, one home"). Pure so it's
 * testable without the query stack.
 */
export function buildYearVerdict(
  totalYTDSpent: number,
  totalAnnual: number,
  monthsElapsed: number
): YearVerdict {
  const pctUsed = totalAnnual > 0 ? (totalYTDSpent / totalAnnual) * 100 : null
  const pctYearLeft = Math.max(0, ((12 - monthsElapsed) / 12) * 100)
  const projectedAnnual = monthsElapsed > 0 ? (totalYTDSpent / monthsElapsed) * 12 : totalAnnual
  const diff = projectedAnnual - totalAnnual
  return { pctUsed, pctYearLeft, projectedAnnual, diff }
}
