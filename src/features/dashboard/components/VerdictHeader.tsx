import { Link } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { YearMonthSelector } from '@/components/ui/YearMonthSelector'
import { formatCompact, formatCurrency } from '@/lib/format'

import type { LastActiveMonthHint } from '../hooks/useDashboardData'
import type { Verdict } from '../lib/contracts'

import { renderParts } from './textParts'

interface VerdictHeaderProps {
  verdict: Verdict
  // headline numbers (the "by the numbers" row)
  totalIncome: number
  totalDebit: number
  savings: number
  // period selector + meta
  currentMonthLabel: string
  displayYear: number
  selectorYear: number
  selectorMonth: number
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
  onPeriodJump: (year: number, month: number) => void
  isLoading: boolean
  pendingCount: number
  pendingUrl: string
  lastActiveMonthHint: LastActiveMonthHint | null
}

const STATUS_META: Record<Verdict['status'], { label: string; cls: string }> = {
  'on-track': { label: 'On track', cls: 'text-[var(--pos)] bg-[var(--pos-soft)]' },
  watch: { label: 'Watch', cls: 'text-[var(--warn)] bg-[var(--warn-soft)]' },
  over: { label: 'Over', cls: 'text-[var(--accent)] bg-[var(--accent-soft)]' },
}

export function VerdictHeader({
  verdict,
  totalIncome,
  totalDebit,
  savings,
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
  lastActiveMonthHint,
}: VerdictHeaderProps) {
  const status = STATUS_META[verdict.status]

  return (
    <header className="verdict-header flex flex-wrap items-start justify-between gap-4 rounded-[18px] border border-[var(--line)] bg-[linear-gradient(160deg,color-mix(in_oklch,var(--accent)_8%,var(--surface)),var(--surface))] p-6">
      {/* Left: verdict */}
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-3">{`OVERVIEW · ${currentMonthLabel.toUpperCase()} ${displayYear}`}</p>

        {isLoading ? (
          <Skeleton className="h-16 w-full max-w-xl" />
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold tracking-wide uppercase ${status.cls}`}
            >
              <span className="h-[6px] w-[6px] rounded-full bg-current" aria-hidden />
              {status.label}
            </span>

            <h1 className="mt-4 text-[22px] leading-[1.3] font-semibold tracking-[-0.01em] text-[var(--ink)] md:text-[27px]">
              {renderParts(verdict.headline)}
            </h1>

            <p className="mt-2 text-[14px] text-[var(--ink-3)]">{verdict.sub}</p>

            {/* By the numbers */}
            <div className="num mt-4 flex flex-wrap gap-x-7 gap-y-1 text-[13px] text-[var(--ink-3)]">
              <span>
                Income{' '}
                <span className="font-semibold text-[var(--ink)]">
                  {formatCurrency(totalIncome)}
                </span>
              </span>
              <span>
                Expenses{' '}
                <span className="font-semibold text-[var(--ink)]">
                  {formatCurrency(totalDebit)}
                </span>
              </span>
              <span>
                Saved{' '}
                <span
                  className={
                    savings >= 0
                      ? 'font-semibold text-[var(--pos)]'
                      : 'font-semibold text-[var(--neg)]'
                  }
                >
                  {formatCompact(savings)}
                </span>
              </span>
              <span>
                Pace{' '}
                <span
                  className={
                    verdict.overPaceAmount > 0
                      ? 'font-semibold text-[var(--neg)]'
                      : 'font-semibold text-[var(--pos)]'
                  }
                >
                  {verdict.overPaceAmount > 0 ? '+' : ''}
                  {formatCompact(verdict.overPaceAmount)}
                </span>
              </span>
            </div>

            {lastActiveMonthHint && (
              <p className="mt-3 text-[12.5px] text-[var(--ink-3)]">
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

            {pendingCount > 0 && (
              <p className="mt-2 text-[12.5px] text-[var(--ink-3)]">
                <Link
                  to={pendingUrl}
                  className="border-b border-[color-mix(in_oklch,var(--accent)_30%,transparent)] pb-px font-medium text-[var(--accent)] no-underline hover:border-[var(--accent)]"
                >
                  {pendingCount} pending categorization
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      {/* Right: period selector + upload */}
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
