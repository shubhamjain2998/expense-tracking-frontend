/**
 * Seasonality & forecast — pure computation for the dashboard redesign.
 *
 * Everything here is derived from the raw processed-transaction list; the module
 * never fetches and never throws. All divisions are guarded.
 *
 * See docs/superpowers/specs/2026-06-14-dashboard-redesign-design.md §3.4
 */
import type { ProcessedTransactionItem } from '@/types/transaction'

import type { SeasonalityResult, SeasonMonth } from './contracts'

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
] as const

/** Mon-based weekday labels; index 0 = Mon … 6 = Sun. */
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const DEFAULT_MONTH_CAP = 15

// ── small helpers ────────────────────────────────────────────────────────────

/** "yyyy-mm" key for a year/month pair (1-based month). */
function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Days in a given 1-based month of a year. */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this month.
  return new Date(year, month, 0).getDate()
}

/** Convert a JS getDay() (0=Sun..6=Sat) to a Mon-based index (0=Mon..6=Sun). */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

/** Absolute expense magnitude for a transaction (0 for non-expense). */
function expenseAmount(t: ProcessedTransactionItem): number {
  if (t.txn_type !== 'expense') return 0
  const n = Math.abs(Number(t.effective_amount))
  return Number.isFinite(n) ? n : 0
}

/** Parse a 'yyyy-mm-dd' date string into {year, month(1-based), day} or null. */
function parseDate(s: string): { year: number; month: number; day: number } | null {
  if (typeof s !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

// ── monthly series (exported, testable) ──────────────────────────────────────

/**
 * Chronological per-calendar-month expense series across all expense txns.
 * Months with no expense txns simply don't appear (we key off txns present).
 */
export function monthlyExpenseSeries(txns: ProcessedTransactionItem[]): SeasonMonth[] {
  const byKey = new Map<string, SeasonMonth>()

  for (const t of txns ?? []) {
    if (t?.txn_type !== 'expense') continue
    const d = parseDate(t.txn_date)
    if (!d) continue
    const key = monthKey(d.year, d.month)
    const amount = expenseAmount(t)
    const existing = byKey.get(key)
    if (existing) {
      existing.expense += amount
    } else {
      byKey.set(key, {
        year: d.year,
        month: d.month,
        label: SHORT_MONTHS[d.month - 1],
        expense: amount,
      })
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  )
}

// ── main ─────────────────────────────────────────────────────────────────────

export function computeSeasonality(
  txns: ProcessedTransactionItem[],
  now: Date,
  opts?: { monthsWindow?: number; projectedFY?: number }
): SeasonalityResult {
  const list = Array.isArray(txns) ? txns : []
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1 // 1-based
  const nowDay = now.getDate()

  // Full chronological series, then windowed.
  const fullSeries = monthlyExpenseSeries(list)

  let months: SeasonMonth[]
  if (opts?.monthsWindow && opts.monthsWindow > 0) {
    // Trailing N calendar months ending at `now` (inclusive), filled from series.
    months = trailingWindow(fullSeries, nowYear, nowMonth, opts.monthsWindow)
  } else {
    months = fullSeries.slice(-DEFAULT_MONTH_CAP)
  }

  // Mean of the windowed months' expenses.
  const mean = months.length > 0 ? months.reduce((s, m) => s + m.expense, 0) / months.length : 0

  // Peak / calmest exclude the in-progress current month (partial), but the
  // current month stays in `months`.
  const currentKey = monthKey(nowYear, nowMonth)
  const selectable = months.filter((m) => monthKey(m.year, m.month) !== currentKey)

  let peak: SeasonMonth | null = null
  let calmest: SeasonMonth | null = null
  for (const m of selectable) {
    if (!peak || m.expense > peak.expense) peak = m
    if (!calmest || m.expense < calmest.expense) calmest = m
  }

  // Current vs previous calendar month (relative to `now`), from full series so
  // a narrow window never hides the comparison.
  const currentMonthExpense = lookupExpense(fullSeries, nowYear, nowMonth)
  const prev = prevMonth(nowYear, nowMonth)
  const prevMonthExpense = lookupExpense(fullSeries, prev.year, prev.month)
  const currentVsLastMonthPct =
    prevMonthExpense > 0 ? (currentMonthExpense - prevMonthExpense) / prevMonthExpense : null

  // Current vs same calendar month one year earlier.
  const sameMonthLastYearExpense = lookupExpense(fullSeries, nowYear - 1, nowMonth)
  const currentVsSameMonthLastYearPct =
    sameMonthLastYearExpense > 0
      ? (currentMonthExpense - sameMonthLastYearExpense) / sameMonthLastYearExpense
      : null

  // Day-of-week totals across ALL expense txns (not just the window).
  const dowTotals = new Array(7).fill(0)
  for (const t of list) {
    if (t?.txn_type !== 'expense') continue
    const d = parseDate(t.txn_date)
    if (!d) continue
    const jsDay = new Date(d.year, d.month - 1, d.day).getDay()
    dowTotals[mondayIndex(jsDay)] += expenseAmount(t)
  }
  const dayOfWeek = WEEKDAY_LABELS.map((label, i) => ({ label, total: dowTotals[i] }))

  // Heaviest 1–2 weekdays by total (only those with spend).
  const heaviestDays = [...dayOfWeek]
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 2)
    .map((d) => d.label)

  // Run-rate projection for the current month.
  const dim = daysInMonth(nowYear, nowMonth)
  const projectedThisMonth =
    currentMonthExpense > 0 && nowDay > 0 ? (currentMonthExpense / nowDay) * dim : 0

  // FY projection: caller-supplied wins; else trailing-12 run-rate * 12.
  const projectedFY =
    opts?.projectedFY != null && Number.isFinite(opts.projectedFY)
      ? opts.projectedFY
      : fallbackProjectedFY(fullSeries, nowYear, nowMonth)

  return {
    months,
    mean,
    peak,
    calmest,
    currentVsLastMonthPct,
    currentVsSameMonthLastYearPct,
    dayOfWeek,
    heaviestDays,
    projectedThisMonth,
    projectedFY,
  }
}

// ── internal computations ────────────────────────────────────────────────────

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function lookupExpense(series: SeasonMonth[], year: number, month: number): number {
  const m = series.find((s) => s.year === year && s.month === month)
  return m ? m.expense : 0
}

/**
 * Build a dense trailing window of `count` calendar months ending at
 * (endYear, endMonth) inclusive, filling absent months with 0 expense.
 */
function trailingWindow(
  series: SeasonMonth[],
  endYear: number,
  endMonth: number,
  count: number
): SeasonMonth[] {
  const out: SeasonMonth[] = []
  let y = endYear
  let m = endMonth
  for (let i = 0; i < count; i++) {
    out.push({
      year: y,
      month: m,
      label: SHORT_MONTHS[m - 1],
      expense: lookupExpense(series, y, m),
    })
    const p = prevMonth(y, m)
    y = p.year
    m = p.month
  }
  return out.reverse() // chronological oldest→newest
}

/**
 * Fallback FY projection: average monthly expense over the trailing 12 calendar
 * months (relative to `now`), scaled to a full year. Uses only the months that
 * actually fall within that trailing window and carry spend, divided by the
 * count of distinct months covered (capped at 12).
 */
function fallbackProjectedFY(series: SeasonMonth[], nowYear: number, nowMonth: number): number {
  // Collect the trailing 12 months' totals.
  let y = nowYear
  let m = nowMonth
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += lookupExpense(series, y, m)
    const p = prevMonth(y, m)
    y = p.year
    m = p.month
  }
  // monthsCovered = distinct months in the series that have any expense.
  const monthsCovered = series.length
  const denom = Math.min(12, monthsCovered)
  if (denom <= 0) return 0
  return (sum / denom) * 12
}
