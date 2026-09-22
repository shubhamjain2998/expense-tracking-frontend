/**
 * Calendar-month arithmetic for "copy this transaction to another month".
 *
 * Plain `Date` month stepping overflows — 31 Jan + 1 month lands on 3 March,
 * because JS normalizes day 31 of February forward. A copy must stay in the
 * month the user picked, so the day is clamped to that month's length instead.
 * Everything here works on the "YYYY-MM-DD" string parts: no `Date` parsing,
 * so no timezone can shift the day.
 */

const MONTH_NAMES = [
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

interface Parts {
  year: number
  month: number // 1-12
  day: number
}

function parse(iso: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/** Days in a (1-12) month, leap years included. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Shift an ISO date by whole calendar months, keeping the day of the month
 * where it exists and clamping it where it does not (31 Jan → 28 Feb).
 * Returns the input unchanged if it is not a parseable ISO date.
 */
export function shiftMonths(iso: string, delta: number): string {
  const p = parse(iso)
  if (!p) return iso
  const zeroBased = p.year * 12 + (p.month - 1) + delta
  const year = Math.floor(zeroBased / 12)
  const month = (zeroBased % 12) + 1
  const day = Math.min(p.day, daysInMonth(year, month))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "October 2026" — the month a date lands in, spelled out for the stepper. */
export function monthYearLabel(iso: string): string {
  const p = parse(iso)
  if (!p) return ''
  return `${MONTH_NAMES[p.month - 1]} ${p.year}`
}

/**
 * Whole calendar months from `from` to `to` (negative when `to` is earlier).
 * Day of month is ignored: 31 Jan → 1 Feb is one month apart, which is what
 * "copied to next month" means to a reader.
 */
export function monthsApart(from: string, to: string): number {
  const a = parse(from)
  const b = parse(to)
  if (!a || !b) return 0
  return (b.year - a.year) * 12 + (b.month - a.month)
}
