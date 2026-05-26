import { Link } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { YearMonthSelector } from '@/components/ui/YearMonthSelector'
import { useCountUp } from '@/hooks/useCountUp'
import { formatCompact, formatCurrency, formatCurrencyParts } from '@/lib/format'

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
  isLoading: boolean
  pendingCount: number
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
  isLoading,
  pendingCount,
}: DashboardHeaderProps) {
  const animatedTotal = useCountUp(totalDebit, { duration: 750 })

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

        {!isLoading && <div className="ink-rule" aria-hidden />}

        {!isLoading && (
          <p className="mt-3 text-[13px] leading-[1.4] text-[var(--ink-3)]">
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
            {pendingCount > 0 && (
              <>
                {' · '}
                <Link
                  to="/transactions"
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
