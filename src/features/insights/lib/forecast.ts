/**
 * "Which day, and what's next" (Insights §4) — weekday averages and a
 * same-calendar-month-in-prior-years forecast.
 *
 * `computeSeasonality` (src/features/dashboard/lib/seasonality.ts, not
 * edited) gives day-of-week TOTALS and a trailing-window mean, but neither
 * a weekday AVERAGE (it doesn't know how many Fridays occurred) nor a
 * next-calendar-month projection (it only run-rates the in-progress month).
 * Both are derived here, locally, from the same `allHistory` list — reusing
 * `monthlyExpenseSeries`, the one exported helper that already builds a
 * chronological per-month series, rather than re-deriving it.
 */
import { monthlyExpenseSeries } from '@/features/dashboard/lib/seasonality'
import type { ProcessedTransactionItem } from '@/types/transaction'

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

function parseDate(s: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '')
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

export interface DowAverage {
  label: string
  avg: number
  /** Raw total for this weekday (post rent/SIP exclusion) — the share-of-spend
   *  sentence needs actual money, not an average-of-averages. */
  total: number
}

/**
 * Average expense per weekday — total ÷ number of DISTINCT dates that
 * weekday appeared with any expense activity (not txn count, and not a
 * fixed 52/7 — the account's history may be shorter). Excludes rent and
 * SIP charges (tag name 'rent' / 'sip'), matching the section's stated
 * scope: recurring, same-day-every-month charges would otherwise dominate a
 * single weekday and hide the discretionary pattern the section exists to
 * show.
 */
export function computeDowAverages(txns: ProcessedTransactionItem[]): DowAverage[] {
  const totals = new Array(7).fill(0) as number[]
  const dates: Set<string>[] = Array.from({ length: 7 }, () => new Set())

  for (const t of txns) {
    if (t.txn_type !== 'expense') continue
    const isRentOrSip = (t.tags ?? []).some((tag) => {
      const name = tag.name.trim().toLowerCase()
      return name === 'rent' || name === 'sip'
    })
    if (isRentOrSip) continue
    const d = parseDate(t.txn_date)
    if (!d) continue
    const amount = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amount)) continue
    const idx = mondayIndex(new Date(d.year, d.month - 1, d.day).getDay())
    totals[idx] += amount
    dates[idx].add(t.txn_date.slice(0, 10))
  }

  return WEEKDAY_LABELS.map((label, i) => ({
    label,
    avg: dates[i].size > 0 ? totals[i] / dates[i].size : 0,
    total: totals[i],
  }))
}

export interface NextMonthForecast {
  label: string
  year: number
  month: number
  /** Mean of the same calendar month in prior years (the projection). */
  projected: number
  /** Sample spread (population stdev) of those prior years — null with <2 samples. */
  spread: number | null
  /** % vs. the mean of ALL months in the trailing window — null if unknown. */
  pctVsAverage: number | null
  yearsOfHistory: number
}

/**
 * Project next calendar month's spend from how that same calendar month has
 * run in prior years — "March has run 8% above the yearly average" reads
 * directly off this. Falls back gracefully with fewer years of history
 * (yearsOfHistory reports how many samples backed the number).
 */
export function computeNextMonthForecast(
  txns: ProcessedTransactionItem[],
  now: Date
): NextMonthForecast {
  const series = monthlyExpenseSeries(txns)
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = nextDate.getMonth() + 1
  const nextYear = nextDate.getFullYear()

  const overallMean =
    series.length > 0 ? series.reduce((s, m) => s + m.expense, 0) / series.length : 0

  const sameMonthPast = series.filter(
    (m) => m.month === nextMonth && !(m.year === nextYear && m.month === nextMonth)
  )
  const values = sameMonthPast.map((m) => m.expense)
  const projected =
    values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : overallMean

  let spread: number | null = null
  if (values.length >= 2) {
    const variance = values.reduce((s, v) => s + (v - projected) ** 2, 0) / values.length
    spread = Math.sqrt(variance)
  }

  const pctVsAverage = overallMean > 0 ? (projected - overallMean) / overallMean : null

  return {
    label: SHORT_MONTHS[nextMonth - 1],
    year: nextYear,
    month: nextMonth,
    projected,
    spread,
    pctVsAverage,
    yearsOfHistory: values.length,
  }
}
