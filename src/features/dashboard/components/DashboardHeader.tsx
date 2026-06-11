import { Link } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { YearMonthSelector } from '@/components/ui/YearMonthSelector'
import { useCountUp } from '@/hooks/useCountUp'
import { formatCompact, formatCurrency, formatCurrencyParts } from '@/lib/format'

import type { LastActiveMonthHint } from '../hooks/useDashboardData'

interface DashboardHeaderProps {
  totalDebit: number
  totalBudget: number
  overPaceAmount: number
  dayOfMonth: number
  daysInMonth: number
  currentMonthLabel: string
  displayYear: number
  selectorYear: number
  selectorMonth: number
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
  /** Jump both year and month atomically (used by the empty-month hint link). */
  onPeriodJump: (year: number, month: number) => void
  isLoading: boolean
  pendingCount: number
  /** Pre-computed URL for the pending transactions link (lands on the right month). */
  pendingUrl: string
  /**
   * True when the displayed period is the real current calendar month.
   * False for any past or future month.
   */
  isCurrentMonth: boolean
  /**
   * Present when the selected month has zero spend but an adjacent month
   * in the fetched window has activity. Drives the empty-month hero hint.
   */
  lastActiveMonthHint: LastActiveMonthHint | null
}

export function DashboardHeader({
  totalDebit,
  totalBudget,
  overPaceAmount,
  dayOfMonth,
  daysInMonth,
  currentMonthLabel,
  displayYear,
  selectorYear,
  selectorMonth,
  onYearChange,
  onMonthChange,
  onPeriodJump,
  isLoading,
  pendingCount,
  pendingUrl,
  isCurrentMonth,
  lastActiveMonthHint,
}: DashboardHeaderProps) {
  const animatedTotal = useCountUp(totalDebit, { duration: 750 })

  // For fully-elapsed months the pace denominator is 1 (paceAt = 1), so
  // overPaceAmount equals totalDebit − totalBudget — the true budget variance.
  const isPastMonth = !isCurrentMonth && dayOfMonth === daysInMonth

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      {/* Left: spend hero + pace status */}
      <div>
        <p className="eyebrow mb-3">
          {`OVERVIEW · ${currentMonthLabel.toUpperCase()} ${displayYear}`}
        </p>

        {isLoading ? (
          <Skeleton className="h-16 w-80" />
        ) : (
          <h1 className="hero-amount-display num">
            {(() => {
              const p = formatCurrencyParts(animatedTotal, { fractionDigits: 2 })
              return (
                <>
                  <span className="currency">{p.symbol}</span>
                  {p.integer}
                  {p.decimal && <span className="decimals">{p.decimal}</span>}
                </>
              )
            })()}
          </h1>
        )}

        {!isLoading && totalBudget > 0 && (
          <p className="num mt-2 text-[14px] text-[var(--ink-3)]">
            / {formatCurrency(totalBudget)} monthly budget
          </p>
        )}

        {/* Empty-month hint — shown when there is no spend in the selected month
            but another month in the fetched window has activity. */}
        {!isLoading && lastActiveMonthHint && (
          <p className="mt-2 text-[12.5px] text-[var(--ink-3)]">
            No activity in {currentMonthLabel}
            {' — '}
            <button
              type="button"
              onClick={() => onPeriodJump(lastActiveMonthHint.year, lastActiveMonthHint.month)}
              className="border-b border-[color-mix(in_oklch,var(--accent)_30%,transparent)] pb-px font-medium text-[var(--accent)] hover:border-[var(--accent)]"
              style={{ background: 'none', padding: 0, cursor: 'pointer' }}
            >
              last activity {lastActiveMonthHint.label}
            </button>
          </p>
        )}

        {!isLoading && <div className="ink-rule" aria-hidden />}

        {!isLoading && (
          <p className="mt-3 text-[13px] leading-[1.4] text-[var(--ink-3)]">
            {isPastMonth && totalBudget > 0 ? (
              // Completed month: show final budget result, not pace
              overPaceAmount > 0 ? (
                <>
                  Finished{' '}
                  <span className="font-medium text-[var(--neg)]">
                    {formatCompact(overPaceAmount)} over budget
                  </span>
                </>
              ) : overPaceAmount < 0 ? (
                <>
                  Finished{' '}
                  <span className="font-medium text-[var(--pos)]">
                    {formatCompact(Math.abs(overPaceAmount))} under budget
                  </span>
                </>
              ) : (
                <>Finished exactly on budget</>
              )
            ) : (
              // Current or future month: show day progress + pace
              <>
                Day {dayOfMonth} of {daysInMonth}
                {overPaceAmount > 0 && totalBudget > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-[var(--neg)]">
                      {formatCompact(overPaceAmount)} over pace
                    </span>
                  </>
                )}
                {overPaceAmount < 0 && totalBudget > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-[var(--pos)]">
                      {formatCompact(Math.abs(overPaceAmount))} under pace
                    </span>
                  </>
                )}
              </>
            )}
            {pendingCount > 0 && (
              <>
                {' · '}
                <Link
                  to={pendingUrl}
                  className="border-b border-[color-mix(in_oklch,var(--accent)_30%,transparent)] pb-px font-medium text-[var(--accent)] no-underline hover:border-[var(--accent)]"
                >
                  {pendingCount} pending categorization
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {/* Right: PERIOD eyebrow + month picker + upload (desktop).
          Upload is covered by the BottomTabBar on mobile. */}
      <div className="flex shrink-0 flex-col items-end gap-3">
        <p className="eyebrow">PERIOD</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <YearMonthSelector
            year={selectorYear}
            month={selectorMonth}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
          />
          <Link
            to="/upload"
            className="btn primary hidden gap-[5px] md:inline-flex"
            aria-label="Upload statement"
          >
            <Icon name="upload" size={14} />
            <span>Upload</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
