import { Link } from 'react-router-dom'

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
    <header>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: spend total + pace status line */}
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            {`OVERVIEW · ${currentMonthLabel.toUpperCase()} ${displayYear}`}
          </p>

          {isLoading ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <div className="flex flex-wrap items-baseline gap-2 md:gap-2.5">
              <h1
                className="num text-[32px] font-semibold md:text-[40px]"
                style={{
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {formatCurrency(totalDebit)}
              </h1>
              {totalBudget > 0 && (
                <span
                  className="text-[18px] font-light md:text-[22px]"
                  style={{
                    color: 'var(--ink-3)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  / {formatCurrency(totalBudget)}
                </span>
              )}
            </div>
          )}

          {!isLoading && (
            <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
              Day {dayOfMonth} of {daysInMonth}
              {overPaceAmount > 0 && totalBudget > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span style={{ color: 'var(--neg)', fontWeight: 500 }}>
                    {formatCompact(overPaceAmount)} over pace
                  </span>
                </>
              )}
              {overPaceAmount < 0 && totalBudget > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span style={{ color: 'var(--pos)', fontWeight: 500 }}>
                    {formatCompact(Math.abs(overPaceAmount))} under pace
                  </span>
                </>
              )}
              {pendingCount > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <Link
                    to="/transactions"
                    style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
                  >
                    {pendingCount} pending categorization
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        {/* Right: tag filter, month picker, upload shortcut */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {tags.length > 0 && (
            <select
              value={selectedTagId}
              onChange={(e) => onTagChange(e.target.value)}
              className="input"
              style={{ width: 'auto' }}
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
          <Link
            to="/upload"
            className="btn primary"
            style={{ gap: 5 }}
            aria-label="Upload statement"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              upload
            </span>
            <span className="desktop-only">Upload</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
