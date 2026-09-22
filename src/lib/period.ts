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

/**
 * The one sticky selection shared app-wide — see `usePeriod` in
 * `src/hooks/usePeriod.ts`, the single source of truth this backs.
 * Distinct from `PERIOD_MODE_STORAGE_KEY` above, which stores the fy/
 * calendar *mode*, not a specific period.
 *
 * The value is stored in CALENDAR units (`calYear`/`calMonth`), never in
 * period units. Period units are meaningless without the mode that produced
 * them: period_month 9 is September in calendar mode and December in FY
 * mode, so a value written under one mode and read back under the other
 * silently lands the whole app three months away. Storing the calendar month
 * makes the value mode-independent; `usePeriod` converts on read/write.
 */
export const PERIOD_STORAGE_KEY = 'period_selection'

export interface StoredPeriod {
  calYear: number
  calMonth: number
}

/** A period_year is a plain 4-digit-ish year — reject NaN, floats, and junk. */
export function isValidPeriodYear(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2000 && value <= 2100
}

/** A period_month is always 1-12, in whichever mode is active. */
export function isValidPeriodMonth(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12
}

/**
 * Reads the stored calendar (year, month). Values written by the pre-calendar
 * format (`{ year, month }`, in period units) fail validation and are treated
 * as absent — deliberately: there is no way to tell which mode wrote them, so
 * resuming on today beats resuming three months off.
 */
export function loadStoredPeriod(): StoredPeriod | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PERIOD_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { calYear?: unknown; calMonth?: unknown }
    if (isValidPeriodYear(parsed.calYear) && isValidPeriodMonth(parsed.calMonth)) {
      return { calYear: parsed.calYear, calMonth: parsed.calMonth }
    }
    return null
  } catch {
    return null
  }
}

export function saveStoredPeriod(calYear: number, calMonth: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({ calYear, calMonth }))
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded contexts —
    // persistence here is a convenience, not a requirement.
  }
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

/**
 * Translate a calendar (year, month) — e.g. the parts of a `txn_date` — to the
 * (period_year, period_month) tuple that contains it. Inverse of
 * `resolvePeriodMonth`.
 *
 * Always use this before putting a month into a `?month=` URL param or
 * comparing it against a page's `month` state: those are period months, so in
 * FY mode a raw calendar month is off by three (September → December).
 */
export function calendarToPeriod(
  calYear: number,
  calMonth: number,
  mode: PeriodMode
): { year: number; month: number } {
  if (mode === 'calendar') {
    return { year: calYear, month: calMonth }
  }
  // FY: April-Dec belong to year=calYear; Jan-Mar belong to year=calYear-1.
  const fyYear = calMonth >= 4 ? calYear : calYear - 1
  // Map calendar month -> FY index (1=April, …, 12=March).
  const fyMonth = ((calMonth - 4 + 12) % 12) + 1
  return { year: fyYear, month: fyMonth }
}

/** Returns the period_year and period_month containing today's date. */
export function getCurrentPeriod(
  mode: PeriodMode,
  now = new Date()
): {
  year: number
  month: number
} {
  return calendarToPeriod(now.getFullYear(), now.getMonth() + 1, mode)
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
