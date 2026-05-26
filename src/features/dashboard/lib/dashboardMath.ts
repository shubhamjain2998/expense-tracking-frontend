import type { PeriodMode } from '@/lib/period'
import { monthShortLabel } from '@/lib/period'
import type { TrendDataPoint, YTDRow } from '@/types/dashboard'
import type { ProcessedTransactionItem } from '@/types/transaction'

import type {
  CategoryStat,
  IncomeExpenseTrendPoint,
  MonthStat,
  YtdComputedData,
  YtdDataPoint,
} from '../types'

export function computeCategoryStats(txns: ProcessedTransactionItem[]): CategoryStat[] {
  const map = new Map<string, { total: number; count: number }>()
  for (const txn of txns) {
    const amt = Number(txn.effective_amount)
    if (amt > 0) {
      const e = map.get(txn.category) ?? { total: 0, count: 0 }
      e.total += amt
      e.count += 1
      map.set(txn.category, e)
    }
  }
  return Array.from(map.entries())
    .map(([cat, v]) => ({ category: cat, ...v, avg: v.count > 0 ? v.total / v.count : 0 }))
    .sort((a, b) => b.count - a.count)
}

export function computeDailySpend(txns: ProcessedTransactionItem[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const txn of txns) {
    const amt = Number(txn.effective_amount)
    if (amt > 0) {
      const day = parseInt(txn.txn_date.split('T')[0].split('-')[2] ?? '1', 10)
      map.set(day, (map.get(day) ?? 0) + amt)
    }
  }
  return map
}

interface Last6Month {
  year: number
  month: number
  label: string
}

/**
 * Build the stacked-bar trend data.
 * Accepts any array of objects with `category` and `actual` fields so it works
 * with both the legacy SummaryRow and the leaner MultiMonthCategoryRow.
 */
export function computeStackedTrend(
  trendQueriesData: ({ category: string; actual: number | string }[] | undefined)[],
  last6Months: Last6Month[]
): { stackedTrendData: Record<string, number | string>[]; stackCategories: string[] } {
  const catSet = new Set<string>()
  const data = trendQueriesData.map((rows, i) => {
    const obj: Record<string, number | string> = { month: last6Months[i].label }
    let total = 0
    for (const row of rows ?? []) {
      const amt = Math.max(0, Number(row.actual))
      if (amt > 0) {
        obj[row.category] = amt
        catSet.add(row.category)
        total += amt
      }
    }
    obj._total = total
    return obj
  })
  return { stackedTrendData: data, stackCategories: Array.from(catSet) }
}

export function computeIncomeTrendData(
  incomeQueriesData: (ProcessedTransactionItem[] | undefined)[],
  last6Months: Last6Month[]
): IncomeExpenseTrendPoint[] {
  return last6Months.map((m, i) => {
    const txns = incomeQueriesData[i] ?? []
    const income = txns
      .filter((t) => Number(t.effective_amount) < 0)
      .reduce((s, t) => s - Number(t.effective_amount), 0)
    const expense = txns
      .filter((t) => Number(t.effective_amount) > 0)
      .reduce((s, t) => s + Number(t.effective_amount), 0)
    return { month: m.label, income, expense, savings: income - expense }
  })
}

/**
 * Build the YTD cumulative-spend series for the chart.
 *
 * Returns 12 points (one per period month). `actual` is filled through
 * `monthsElapsed` only; `projected` is filled from `monthsElapsed` to the
 * end of the year via simple linear extrapolation from the YTD spend rate.
 * The projected segment overlaps the last actual point by one position so
 * the two lines connect visually.
 *
 * `expected` (linear budget pace) is no longer surfaced — the UI uses the
 * budget-pace KPI chip and a single budget reference line instead.
 */
export function computeYtdLineData(
  yearlyTrendData: TrendDataPoint[],
  annualBudget: number,
  monthsElapsed: number,
  mode: PeriodMode
): YtdDataPoint[] {
  const byPeriodMonth = new Map<number, number>()
  for (const dp of yearlyTrendData) {
    // dp.month is always a calendar month (1=Jan … 12=Dec). Convert to period
    // month so loop index 1 = April in FY mode, 1 = January in calendar mode.
    const pm = mode === 'fy' ? ((dp.month - 4 + 12) % 12) + 1 : dp.month
    byPeriodMonth.set(pm, Number(dp.actual_amount))
  }

  let cumulativeAtElapsed = 0
  for (let pm = 1; pm <= monthsElapsed; pm++) {
    cumulativeAtElapsed += byPeriodMonth.get(pm) ?? 0
  }
  const avgMonthly = monthsElapsed > 0 ? cumulativeAtElapsed / monthsElapsed : 0

  let cumulative = 0
  return Array.from({ length: 12 }, (_, i) => {
    const pm = i + 1
    const isElapsed = pm <= monthsElapsed

    if (isElapsed) {
      cumulative += byPeriodMonth.get(pm) ?? 0
    }

    const actual = isElapsed ? cumulative : null
    const expected = annualBudget > 0 ? Math.round((annualBudget * pm) / 12) : null
    // Projected segment starts at the last actual point so the lines connect.
    const projected =
      monthsElapsed > 0 && pm >= monthsElapsed
        ? Math.round(cumulativeAtElapsed + (pm - monthsElapsed) * avgMonthly)
        : null

    return {
      month: monthShortLabel(pm, mode),
      actual,
      expected,
      projected,
    }
  })
}

export function computeYtdExtras(params: {
  ytdRows: YTDRow[]
  yearlyTrendData: TrendDataPoint[]
  ytdSpentTotal: number
  month: number
  projectedFY: number
  expectedYtd: number
}): YtdComputedData {
  const { ytdRows, yearlyTrendData, ytdSpentTotal, month, projectedFY, expectedYtd } = params

  // Per-category income breakdown — the backend YTD endpoint stores income
  // categories as negative actual_ytd. (Some deployments don't return income
  // categories at all here; the breakdown list will be empty in that case
  // but ytdIncomeTotal below still resolves from yearlyTrendData.)
  const ytdIncomeSources = ytdRows
    .filter((r) => r.actual_ytd < 0)
    .map((r) => ({ category: r.category, total: Math.abs(r.actual_ytd) }))
    .sort((a, b) => b.total - a.total)

  // Authoritative YTD income total: sum the multi-month summary's
  // income_amount per period. This matches the per-month dashboard's
  // totalIncome (which strictly uses txn_type === 'income') and stays
  // correct even when ytdRows doesn't surface income categories.
  const ytdIncomeTotal = yearlyTrendData.reduce((s, d) => s + Number(d.income_amount ?? 0), 0)
  const ytdSaved = ytdIncomeTotal - ytdSpentTotal
  const savingsRate = ytdIncomeTotal > 0 ? Math.round((ytdSaved / ytdIncomeTotal) * 100) : null

  const projectedFYIncome =
    month > 0 && ytdIncomeTotal > 0 ? Math.round((ytdIncomeTotal / month) * 12) : 0
  // Project savings even when income hasn't been recorded — the projected
  // spend alone is a meaningful "deficit if income stays at zero" signal.
  const projectedFYSavings = projectedFYIncome - projectedFY
  const projectedFYSavingsRate =
    projectedFYIncome > 0 ? Math.round((projectedFYSavings / projectedFYIncome) * 100) : null

  // yearlyTrendData.month is always a calendar month after the QA-E backend fix.
  // Store as periodMonth so YtdMonthlyHighlights can index into MONTH_LABELS_FULL
  // (which is also keyed by calendar month) and display the correct name.
  const monthlyStats: MonthStat[] = yearlyTrendData
    .filter((d) => Number(d.actual_amount) > 0 || Number(d.income_amount ?? 0) > 0)
    .map((d) => ({
      periodMonth: d.month, // calendar month — MONTH_LABELS_FULL[calMonth] = correct label
      expense: Number(d.actual_amount),
      income: Number(d.income_amount ?? 0),
      savings: Number(d.income_amount ?? 0) - Number(d.actual_amount),
    }))
    .sort((a, b) => a.periodMonth - b.periodMonth)

  const totalExpenseCount = yearlyTrendData.reduce((s, d) => s + (d.txn_count ?? 0), 0)

  const expenseMonths = monthlyStats.filter((m) => m.expense > 0)
  let momPct: number | null = null
  if (expenseMonths.length >= 2) {
    const last = expenseMonths[expenseMonths.length - 1].expense
    const prev = expenseMonths[expenseMonths.length - 2].expense
    momPct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null
  }

  const avgExpense =
    expenseMonths.length > 0
      ? expenseMonths.reduce((s, m) => s + m.expense, 0) / expenseMonths.length
      : 0
  const highestMonth =
    expenseMonths.length > 0
      ? expenseMonths.reduce((best, m) => (m.expense > best.expense ? m : best))
      : null
  const lowestMonth =
    expenseMonths.length > 0
      ? expenseMonths.reduce((best, m) => (m.expense < best.expense ? m : best))
      : null

  const incomeMonths = monthlyStats.filter((m) => m.income > 0)
  const bestSavingsMonth =
    incomeMonths.length > 0
      ? incomeMonths.reduce((best, m) => (m.savings > best.savings ? m : best))
      : null

  const budgetPace = expectedYtd > 0 ? Math.round((ytdSpentTotal / expectedYtd) * 100) : null

  const expenseCategories = ytdRows
    .filter((r) => r.actual_ytd > 0)
    .sort((a, b) => b.actual_ytd - a.actual_ytd)
  const maxExpense = expenseCategories.length > 0 ? expenseCategories[0].actual_ytd : 1

  const incomeMonthlyAvg = month > 0 ? Math.round(ytdIncomeTotal / month) : 0
  const spentMonthlyAvg = month > 0 ? Math.round(ytdSpentTotal / month) : 0

  return {
    ytdIncomeSources,
    ytdIncomeTotal,
    ytdSaved,
    savingsRate,
    projectedFYIncome,
    projectedFYSavings,
    projectedFYSavingsRate,
    monthlyStats,
    totalExpenseCount,
    momPct,
    avgExpense,
    highestMonth,
    lowestMonth,
    bestSavingsMonth,
    incomeMonthlyAvg,
    spentMonthlyAvg,
    budgetPace,
    expenseCategories,
    maxExpense,
  }
}
