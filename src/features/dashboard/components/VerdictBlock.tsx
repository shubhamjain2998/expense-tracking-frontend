import { Skeleton } from '@/components/ui/Skeleton'
import { YearMonthSelector } from '@/components/ui/YearMonthSelector'
import { useCountUp } from '@/hooks/useCountUp'
import { formatCurrency } from '@/lib/format'
import { useTilt } from '@/lib/useTilt'

import type { LastActiveMonthHint } from '../hooks/useDashboardData'
import type { Verdict } from '../lib/contracts'

import { renderParts } from './textParts'

interface VerdictBlockProps {
  verdict: Verdict
  // The month's income/expense/saved figures appear ONLY here — nowhere
  // else on the page repeats them (MASTER.md §1, "one number, one home").
  totalIncome: number
  totalDebit: number
  /** Only used to tell whether the headline already states the daily
   *  allowance (insights.ts only omits it when there's no budget) — see
   *  `headlineHasAllowance` below. Not rendered anywhere in this block. */
  totalBudget: number
  daysLeftInMonth: number
  dayOfMonth: number
  daysInMonth: number
  currentMonthLabel: string
  displayYear: number
  selectorYear: number
  selectorMonth: number
  onPeriodChange: (year: number, month: number) => void
  onPeriodJump: (year: number, month: number) => void
  isLoading: boolean
  lastActiveMonthHint: LastActiveMonthHint | null
}

/**
 * Block 1 — Verdict. "Am I OK this month?"
 * design-system/kosh-ledger/pages/dashboard.md — owns income, spend, saved,
 * savings rate, daily allowance and days left. Nothing else on Home renders
 * these numbers.
 */
export function VerdictBlock({
  verdict,
  totalIncome,
  totalDebit,
  totalBudget,
  daysLeftInMonth,
  dayOfMonth,
  daysInMonth,
  currentMonthLabel,
  displayYear,
  selectorYear,
  selectorMonth,
  onPeriodChange,
  onPeriodJump,
  isLoading,
  lastActiveMonthHint,
}: VerdictBlockProps) {
  const saved = totalIncome - totalDebit
  const savingsRate = totalIncome > 0 ? (saved / totalIncome) * 100 : null

  // insights.ts's buildVerdict only omits the "spend X/day" figure from the
  // headline when there's no budget to pace against (totalBudget <= 0) — in
  // both the over-pace and under-pace branches it always names the daily
  // allowance. Rendering the "Left to spend" tile in those cases would print
  // the same number twice on the page, so the tile only appears when the
  // headline genuinely doesn't carry it.
  const headlineHasAllowance = totalBudget > 0

  // Hero count-up — kept from the previous header, it still reads well at
  // this size (four KPI-sized figures rather than one giant hero number).
  const animIncome = useCountUp(totalIncome, { duration: 750 })
  const animDebit = useCountUp(totalDebit, { duration: 750 })
  const animSaved = useCountUp(saved, { duration: 750 })
  const animAllowance = useCountUp(Math.round(verdict.allowancePerDay), { duration: 750 })

  // The one raised surface on Home. 3deg is deliberately small: the slab
  // is ~1200px wide, so anything larger throws the far edge far enough
  // that the headline visibly skews.
  const {
    ref: tiltRef,
    onPointerMove: onTiltMove,
    onPointerLeave: onTiltLeave,
  } = useTilt<HTMLDivElement>({ max: 3 })

  return (
    <section className="tilt">
      <div
        ref={tiltRef}
        onPointerMove={onTiltMove}
        onPointerLeave={onTiltLeave}
        className="verdict slab sheen tilt-body"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <p className="eyebrow">
            {currentMonthLabel} {displayYear} · day {Math.min(dayOfMonth, daysInMonth)} of{' '}
            {daysInMonth}
          </p>

          {isLoading ? (
            <>
              <Skeleton className="h-7 w-full max-w-xl" />
              <div className="flex flex-wrap gap-8">
                <Skeleton className="h-11 w-24" />
                <Skeleton className="h-11 w-24" />
                <Skeleton className="h-11 w-24" />
                <Skeleton className="h-11 w-24" />
              </div>
            </>
          ) : (
            <>
              <p className="verdict-line">{renderParts(verdict.headline)}</p>

              <div className="money-row">
                <span className="money">
                  <span className="eyebrow">In</span>
                  <span className="v pos">{formatCurrency(animIncome)}</span>
                </span>
                <span className="money">
                  <span className="eyebrow">Out</span>
                  <span className="v">{formatCurrency(animDebit)}</span>
                </span>
                <span className="money">
                  <span className="eyebrow">Saved</span>
                  <span className={['v', saved < 0 ? 'neg' : null].filter(Boolean).join(' ')}>
                    {formatCurrency(animSaved)}
                  </span>
                  {savingsRate !== null && (
                    <span className="text-[12.5px] text-[var(--ink-3)]">
                      {Math.round(savingsRate)}% of income
                    </span>
                  )}
                </span>
                {!headlineHasAllowance && (
                  <span className="money">
                    <span className="eyebrow">Left to spend</span>
                    <span className="v">
                      {formatCurrency(animAllowance)}
                      <span className="text-[13px] font-normal text-[var(--ink-3)]">/day</span>
                    </span>
                    {daysLeftInMonth > 0 && (
                      <span className="text-[12.5px] text-[var(--ink-3)]">
                        for {daysLeftInMonth} day{daysLeftInMonth === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {lastActiveMonthHint && (
                <p className="text-[12.5px] text-[var(--ink-3)]">
                  No activity in {currentMonthLabel}
                  {' — '}
                  <button
                    type="button"
                    onClick={() =>
                      onPeriodJump(lastActiveMonthHint.year, lastActiveMonthHint.month)
                    }
                    className="cursor-pointer border-b border-[var(--accent)] pb-px font-medium text-[var(--accent)]"
                    style={{ background: 'none', padding: 0 }}
                  >
                    last activity {lastActiveMonthHint.label}
                  </button>
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="eyebrow">Period</span>
          <YearMonthSelector
            year={selectorYear}
            month={selectorMonth}
            onPeriodChange={onPeriodChange}
          />
        </div>
      </div>
    </section>
  )
}
