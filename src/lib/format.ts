/**
 * Currency, number, and date formatters shared across the app.
 *
 * These were duplicated 5+ times across pages — every divergence was a bug
 * waiting to happen (different fraction-digits, different locales, etc.).
 */

const INR_FRACTION_0 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const INR_FRACTION_2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export interface FormatCurrencyOptions {
  /** Number of fraction digits. Default 0 (whole rupees, dashboard-friendly). */
  fractionDigits?: 0 | 2
}

export function formatCurrency(n: number, opts: FormatCurrencyOptions = {}): string {
  const f = opts.fractionDigits === 2 ? INR_FRACTION_2 : INR_FRACTION_0
  return f.format(n)
}

/** Compact rupee notation for tight spaces: ₹1.2L, ₹45k, ₹500. */
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

/** "15 Apr" — day-month, used in transaction lists. */
export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** "15 April 2025" — used in headers and detail views. */
export function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** ISO date "YYYY-MM-DD" of `now` — used to seed date inputs. */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
