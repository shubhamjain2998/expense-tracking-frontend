import type { PeriodMode } from '@/lib/period'
import { monthShortLabel } from '@/lib/period'
import type { TrendDataPoint } from '@/types/dashboard'

export interface YearOutlookPoint {
  /** Period month, 1-12 (1 = April in FY mode, January otherwise). */
  periodMonth: number
  label: string
  /** Cumulative totals through this month; null once the month is in the future. */
  outActual: number | null
  inActual: number | null
  /** Cumulative projection; starts at the last actual point so the lines join. */
  outProjected: number | null
  inProjected: number | null
}

export interface YearTotals {
  income: number
  expense: number
  saved: number
  /** Saved as a whole-number percentage of income; null with no income. */
  savingsRate: number | null
}

export interface YearOutlook {
  points: YearOutlookPoint[]
  soFar: YearTotals
  /** Null when there is nothing to project: the year is over or has not started. */
  yearEnd: YearTotals | null
  /** The monthly in/out the projection assumes for every month still to come. */
  monthlyPace: { income: number; expense: number } | null
}

function totals(income: number, expense: number): YearTotals {
  const saved = income - expense
  return {
    income,
    expense,
    saved,
    savingsRate: income > 0 ? Math.round((saved / income) * 100) : null,
  }
}

/**
 * The year at a glance: cumulative in/out through today, and where both land
 * at year end if the months still to come look like the months already done.
 *
 * The pace is the average of the *completed* months. The current month is
 * partial, so averaging it in would drag the pace down; instead it is
 * projected to finish at whichever is larger, what it has already reached or
 * the pace. With no completed month yet, the current month is scaled up by
 * how far through it we are.
 *
 * `monthsElapsed` counts the current month (1-12); 0 means the year has not
 * started. `currentMonthFraction` is how much of the current month has
 * passed, in (0, 1].
 */
export function computeYearOutlook(
  yearlyTrendData: TrendDataPoint[],
  mode: PeriodMode,
  monthsElapsed: number,
  currentMonthFraction: number
): YearOutlook {
  const byPeriodMonth = new Map<number, { income: number; expense: number }>()
  for (const dp of yearlyTrendData) {
    // dp.month is a calendar month; convert so index 1 is the year's first month.
    const pm = mode === 'fy' ? ((dp.month - 4 + 12) % 12) + 1 : dp.month
    byPeriodMonth.set(pm, {
      income: Number(dp.income_amount ?? 0),
      expense: Number(dp.actual_amount),
    })
  }
  const monthAt = (pm: number) => byPeriodMonth.get(pm) ?? { income: 0, expense: 0 }

  let soFarIncome = 0
  let soFarExpense = 0
  for (let pm = 1; pm <= monthsElapsed; pm++) {
    soFarIncome += monthAt(pm).income
    soFarExpense += monthAt(pm).expense
  }

  const projecting = monthsElapsed > 0 && monthsElapsed < 12
  let monthlyPace: YearOutlook['monthlyPace'] = null
  // The rest of the current month, added on top of what it has already reached.
  let currentTopUp = { income: 0, expense: 0 }

  if (projecting) {
    const completed = monthsElapsed - 1
    const current = monthAt(monthsElapsed)
    if (completed > 0) {
      let income = 0
      let expense = 0
      for (let pm = 1; pm <= completed; pm++) {
        income += monthAt(pm).income
        expense += monthAt(pm).expense
      }
      monthlyPace = { income: income / completed, expense: expense / completed }
    } else {
      const fraction = Math.min(1, Math.max(currentMonthFraction, 1 / 31))
      monthlyPace = { income: current.income / fraction, expense: current.expense / fraction }
    }
    currentTopUp = {
      income: Math.max(0, monthlyPace.income - current.income),
      expense: Math.max(0, monthlyPace.expense - current.expense),
    }
  }

  let cumIncome = 0
  let cumExpense = 0
  let projIncome = soFarIncome
  let projExpense = soFarExpense
  const points: YearOutlookPoint[] = Array.from({ length: 12 }, (_, i) => {
    const pm = i + 1
    const isElapsed = pm <= monthsElapsed
    if (isElapsed) {
      cumIncome += monthAt(pm).income
      cumExpense += monthAt(pm).expense
    } else if (projecting && monthlyPace) {
      const topUp = pm === monthsElapsed + 1 ? currentTopUp : { income: 0, expense: 0 }
      projIncome += monthlyPace.income + topUp.income
      projExpense += monthlyPace.expense + topUp.expense
    }
    const showProjection = projecting && pm >= monthsElapsed
    return {
      periodMonth: pm,
      label: monthShortLabel(pm, mode),
      outActual: isElapsed ? Math.round(cumExpense) : null,
      inActual: isElapsed ? Math.round(cumIncome) : null,
      outProjected: showProjection ? Math.round(projExpense) : null,
      inProjected: showProjection ? Math.round(projIncome) : null,
    }
  })

  return {
    points,
    soFar: totals(Math.round(soFarIncome), Math.round(soFarExpense)),
    yearEnd: projecting ? totals(Math.round(projIncome), Math.round(projExpense)) : null,
    monthlyPace,
  }
}
