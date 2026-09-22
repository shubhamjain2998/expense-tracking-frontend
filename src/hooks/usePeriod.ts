import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  type PeriodMode,
  calendarToPeriod,
  getCurrentPeriod,
  isValidPeriodMonth,
  isValidPeriodYear,
  loadStoredPeriod,
  resolvePeriodMonth,
  saveStoredPeriod,
} from '@/lib/period'

import { usePeriodMode } from './usePeriodMode'

export interface UsePeriodResult {
  year: number
  month: number
  setPeriod: (y: number, m: number) => void
}

export interface UsePeriodValueResult {
  year: number
  month: number
}

function parseIntParam(v: string | null): number | undefined {
  if (v === null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : undefined
}

/**
 * Pure resolution of the sticky period from the current URL search params,
 * shared by both `usePeriod` and `usePeriodValue` below so there is exactly
 * one precedence rule (URL → localStorage → current calendar period) no
 * matter which hook a component uses.
 *
 * `mode` is the active period mode. Everything this returns is in that mode's
 * period units; the stored value is in calendar units and is converted here,
 * so a mode change re-resolves to the same real month instead of shifting the
 * app three months (period_month 9 = September in calendar mode, December in
 * FY mode).
 */
function resolvePeriod(searchParams: URLSearchParams, mode: PeriodMode) {
  const urlYear = parseIntParam(searchParams.get('year'))
  const urlMonth = parseIntParam(searchParams.get('month'))
  const urlYearValid = isValidPeriodYear(urlYear)
  const urlMonthValid = isValidPeriodMonth(urlMonth)

  const storedCal = loadStoredPeriod()
  const stored = storedCal ? calendarToPeriod(storedCal.calYear, storedCal.calMonth, mode) : null
  const current = getCurrentPeriod(mode)

  const year = urlYearValid ? (urlYear as number) : (stored?.year ?? current.year)
  const month = urlMonthValid ? (urlMonth as number) : (stored?.month ?? current.month)

  return { year, month, urlYearValid, urlMonthValid }
}

/**
 * Read-only accessor for the sticky period. For components that need the
 * resolved year/month to build links or render a label but do not own a
 * period route — e.g. `SideNav`/`BottomTabBar`, which render on every route
 * including Settings. Unlike `usePeriod`, this never writes to the URL, so
 * mounting it on a period-agnostic page (Settings) can't leak `?year=&month=`
 * onto that page's URL. See `usePeriod` for the owning variant.
 */
export function usePeriodValue(): UsePeriodValueResult {
  const [searchParams] = useSearchParams()
  const { mode } = usePeriodMode()
  const { year, month } = resolvePeriod(searchParams, mode)
  return { year, month }
}

/**
 * The one sticky period (`year`/`month`, in the active period-mode's own
 * units — see `lib/period.ts`) shared across Home, Transactions, Budget,
 * Insights and the Category drill-down.
 *
 * Precedence: a valid `?year=&month=` URL param wins, then the last period
 * saved to localStorage, then the current calendar period. Every page that
 * has a period should read/write it through this hook instead of re-deriving
 * its own initial state — independent re-derivation (each page calling
 * `getCurrentPeriod` on mount) is what let Budget drift out of sync with the
 * rest of the app.
 *
 * This is the *owning* variant: it backfills the URL and mirrors to
 * localStorage, so only call it from a page that actually owns a period
 * route (Home, Transactions, Budget, Insights, Category). A component that
 * merely needs to read the period — e.g. to build a link — should use
 * `usePeriodValue` instead; calling this hook from a period-agnostic route
 * would write `?year=&month=` onto that route's URL.
 *
 * The resolved value is written back to the URL (`replace: true`, so it
 * doesn't spam browser history) whenever a param is missing or out of range,
 * which also doubles as the NaN/garbage-param guard. It's mirrored to
 * localStorage whenever it changes so a reload or a brand-new tab resumes on
 * the last period instead of snapping back to today.
 */
export function usePeriod(): UsePeriodResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const { mode, isLoadingPreference } = usePeriodMode()
  const { year, month, urlYearValid, urlMonthValid } = resolvePeriod(searchParams, mode)

  // Backfill the URL when a param is missing or out of range, so the
  // resolved period is immediately deep-linkable and a bad param (e.g.
  // `?month=13`) settles onto a valid one instead of rendering NaN.
  //
  // Held until /auth/me settles: until then `mode` is only the localStorage
  // guess, and writing period units derived from the wrong mode would land
  // the app three months off and immediately need rewriting.
  useEffect(() => {
    if (isLoadingPreference) return
    if (urlYearValid && urlMonthValid) return
    setSearchParams(
      (p) => {
        p.set('year', String(year))
        p.set('month', String(month))
        return p
      },
      { replace: true }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingPreference, urlYearValid, urlMonthValid, year, month])

  // A user-initiated mode change (the Settings toggle) leaves the URL holding
  // period units of the OLD mode. Re-express them in the new mode so the page
  // stays on the same real month instead of jumping three months (period
  // month 9 is September in calendar mode, December in FY mode).
  //
  // Only genuine toggles count. The bootstrap transition — localStorage guess
  // → the mode /auth/me reports — must not remap: a `?year=&month=` a link
  // carried is already in the settled mode's units, so remapping it would
  // move the reader off the month the link named.
  const prevModeRef = useRef<PeriodMode | null>(null)
  const remapPendingRef = useRef(false)
  useEffect(() => {
    if (isLoadingPreference) return
    const prevMode = prevModeRef.current
    prevModeRef.current = mode
    if (prevMode === null || prevMode === mode) return
    if (!urlYearValid || !urlMonthValid) return
    const cal = resolvePeriodMonth(year, month, prevMode)
    const next = calendarToPeriod(cal.year, cal.month, mode)
    if (next.year === year && next.month === month) return
    // The mirror effect below runs in this same commit, before the remapped
    // params land. Without this flag it would persist the pre-remap month
    // read through the new mode — the very off-by-three this guards against.
    remapPendingRef.current = true
    setSearchParams(
      (p) => {
        p.set('year', String(next.year))
        p.set('month', String(next.month))
        return p
      },
      { replace: true }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isLoadingPreference])

  // Mirror the resolved period to localStorage — in calendar units, so it
  // survives a mode change as well as a reload or a brand-new tab.
  useEffect(() => {
    if (isLoadingPreference) return
    if (remapPendingRef.current) {
      remapPendingRef.current = false
      return
    }
    const cal = resolvePeriodMonth(year, month, mode)
    saveStoredPeriod(cal.year, cal.month)
  }, [isLoadingPreference, year, month, mode])

  const setPeriod = useCallback(
    (y: number, m: number) => {
      setSearchParams(
        (p) => {
          p.set('year', String(y))
          p.set('month', String(m))
          return p
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  return { year, month, setPeriod }
}
