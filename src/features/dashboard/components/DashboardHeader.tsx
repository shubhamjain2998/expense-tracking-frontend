import { Link } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { YearMonthSelector } from '@/components/ui/YearMonthSelector'
import { formatCompact, formatCurrency } from '@/lib/format'
import type { Tag } from '@/types/settings'

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
  selectedTagId: string
  onTagChange: (id: string) => void
  tags: Tag[]
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
  selectedTagId,
  onTagChange,
  tags,
  isLoading,
  pendingCount,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      {/* Left: spend hero + pace status */}
      <div>
        <p className="eyebrow mb-3">
          {`OVERVIEW · ${currentMonthLabel.toUpperCase()} ${displayYear}`}
        </p>

        {isLoading ? (
          <Skeleton className="h-16 w-80" />
        ) : (
          <div className="flex flex-wrap items-baseline gap-3">
            <h1
              className="display num text-[var(--ink)]"
              style={{ fontSize: 'clamp(48px, 7vw, 80px)', margin: 0 }}
            >
              {formatCurrency(totalDebit)}
            </h1>
            {totalBudget > 0 && (
              <span className="num text-[18px] font-normal text-[var(--ink-3)] md:text-[22px]">
                / {formatCurrency(totalBudget)}
              </span>
            )}
          </div>
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

      {/* Right: tag filter + month picker + upload */}
      <div className="flex shrink-0 items-center gap-2">
        {tags.length > 0 && (
          <select
            value={selectedTagId}
            onChange={(e) => onTagChange(e.target.value)}
            className="input w-auto"
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <YearMonthSelector
          year={selectorYear}
          month={selectorMonth}
          onYearChange={onYearChange}
          onMonthChange={onMonthChange}
        />
        <Link to="/upload" className="btn primary gap-[5px]" aria-label="Upload statement">
          <Icon name="upload" size={14} />
          <span className="desktop-only">Upload</span>
        </Link>
      </div>
    </header>
  )
}
