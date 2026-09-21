import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  getCurrentPeriod,
  isValidPeriodMonth,
  isValidPeriodYear,
  loadPeriodMode,
  loadStoredPeriod,
  saveStoredPeriod,
} from '@/lib/period'

export interface UsePeriodResult {
  year: number
  month: number
  setYear: (y: number) => void
  setMonth: (m: number) => void
  setPeriod: (y: number, m: number) => void
}

function parseIntParam(v: string | null): number | undefined {
  if (v === null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : undefined
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
 * The resolved value is written back to the URL (`replace: true`, so it
 * doesn't spam browser history) whenever a param is missing or out of range,
 * which also doubles as the NaN/garbage-param guard. It's mirrored to
 * localStorage whenever it changes so a reload or a brand-new tab resumes on
 * the last period instead of snapping back to today.
 */
export function usePeriod(): UsePeriodResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const urlYear = parseIntParam(searchParams.get('year'))
  const urlMonth = parseIntParam(searchParams.get('month'))
  const urlYearValid = isValidPeriodYear(urlYear)
  const urlMonthValid = isValidPeriodMonth(urlMonth)

  const stored = loadStoredPeriod()
  // The bootstrap fallback reads the period MODE synchronously from
  // localStorage rather than the async server preference (usePeriodMode) —
  // same reasoning the old per-page bootstraps used: /auth/me hasn't
  // resolved yet on first paint, so this is the only value available.
  const current = getCurrentPeriod(loadPeriodMode())

  const year = urlYearValid ? (urlYear as number) : (stored?.year ?? current.year)
  const month = urlMonthValid ? (urlMonth as number) : (stored?.month ?? current.month)

  // Backfill the URL when a param is missing or out of range, so the
  // resolved period is immediately deep-linkable and a bad param (e.g.
  // `?month=13`) settles onto a valid one instead of rendering NaN.
  useEffect(() => {
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
  }, [urlYearValid, urlMonthValid, year, month])

  // Mirror the resolved period to localStorage so it survives a reload or a
  // brand-new tab.
  useEffect(() => {
    saveStoredPeriod(year, month)
  }, [year, month])

  const setYear = useCallback(
    (y: number) => {
      setSearchParams(
        (p) => {
          p.set('year', String(y))
          return p
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const setMonth = useCallback(
    (m: number) => {
      setSearchParams(
        (p) => {
          p.set('month', String(m))
          return p
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

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

  return { year, month, setYear, setMonth, setPeriod }
}
