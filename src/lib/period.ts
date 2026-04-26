/**
 * Indian financial year ↔ calendar year period helpers (frontend mirror of
 * backend/app/services/period.py).
 *
 * The user's choice is stored in localStorage as `period_mode`. In FY mode a
 * period_year of 2025 means "FY 25-26" (April 2025 → March 2026), and month
 * indices 1-12 map to April-March.
 */

export type PeriodMode = 'calendar' | 'fy'

export const PERIOD_MODE_STORAGE_KEY = 'period_mode'
export const DEFAULT_PERIOD_MODE: PeriodMode = 'fy'

const CALENDAR_MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const CALENDAR_MONTHS_SHORT = [
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

// In FY mode index 0 -> April, …, 11 -> March
const FY_MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]

export function loadPeriodMode(): PeriodMode {
  if (typeof window === 'undefined') return DEFAULT_PERIOD_MODE
  const v = window.localStorage.getItem(PERIOD_MODE_STORAGE_KEY)
  return v === 'calendar' || v === 'fy' ? v : DEFAULT_PERIOD_MODE
}

export function savePeriodMode(mode: PeriodMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PERIOD_MODE_STORAGE_KEY, mode)
}

/** Label for a period_year selector entry. */
export function formatYearLabel(periodYear: number, mode: PeriodMode): string {
  if (mode === 'fy') {
    const a = String(periodYear).slice(-2)
    const b = String(periodYear + 1).slice(-2)
    return `FY ${a}-${b}`
  }
  return String(periodYear)
}

/** Long month name for `period_month` (1-12) in the active mode. */
export function monthLongLabel(periodMonth: number, mode: PeriodMode): string {
  const idx = mode === 'fy' ? FY_MONTH_ORDER[periodMonth - 1] : periodMonth - 1
  return CALENDAR_MONTHS_LONG[idx]
}

/** Short (3-letter) month label. Used for chart x-axes. */
export function monthShortLabel(periodMonth: number, mode: PeriodMode): string {
  const idx = mode === 'fy' ? FY_MONTH_ORDER[periodMonth - 1] : periodMonth - 1
  return CALENDAR_MONTHS_SHORT[idx]
}

/** Returns the period_year and period_month containing today's date. */
export function getCurrentPeriod(
  mode: PeriodMode,
  now = new Date()
): {
  year: number
  month: number
} {
  const calYear = now.getFullYear()
  const calMonth = now.getMonth() + 1 // 1-12
  if (mode === 'calendar') {
    return { year: calYear, month: calMonth }
  }
  // FY: April-Dec belong to year=calYear; Jan-Mar belong to year=calYear-1.
  const fyYear = calMonth >= 4 ? calYear : calYear - 1
  // Map calendar month -> FY index (1=April, …, 12=March).
  const fyMonth = ((calMonth - 4 + 12) % 12) + 1
  return { year: fyYear, month: fyMonth }
}

/**
 * Translate a (period_year, period_month) tuple to the calendar (year, month)
 * it represents. Mirror of backend `resolve_period_month`.
 */
export function resolvePeriodMonth(
  periodYear: number,
  periodMonth: number,
  mode: PeriodMode
): { year: number; month: number } {
  if (mode === 'fy') {
    const calMonth = ((periodMonth - 1 + 3) % 12) + 1
    const calYear = calMonth >= 4 ? periodYear : periodYear + 1
    return { year: calYear, month: calMonth }
  }
  return { year: periodYear, month: periodMonth }
}
