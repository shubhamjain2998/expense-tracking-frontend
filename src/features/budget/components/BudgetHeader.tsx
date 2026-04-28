import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/format'
import { formatYearLabel, monthLongLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'

export function BudgetHeader({
  year,
  month,
  mode,
  isLoading,
  hasEntries,
  totalYTDSpent,
  totalAnnual,
  paceStatus,
  onNavigateMonth,
  onAddClick,
}: {
  year: number
  month: number
  mode: PeriodMode
  isLoading: boolean
  hasEntries: boolean
  totalYTDSpent: number
  totalAnnual: number
  paceStatus: 'under' | 'over' | 'on_track' | null
  onNavigateMonth: (dir: -1 | 1) => void
  onAddClick: () => void
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="card-eyebrow">Budget · {formatYearLabel(year, mode)}</p>
        <h1
          className="text-[22px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          Annual allocation
        </h1>
        {!isLoading && hasEntries && (
          <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
            <span className="num">{formatCurrency(totalYTDSpent)}</span> spent YTD ·{' '}
            <span className="num">{formatCurrency(totalAnnual)}</span> annual budget
            {paceStatus !== null && (
              <>
                {' '}
                ·{' '}
                <span
                  style={{
                    fontWeight: 500,
                    color:
                      paceStatus === 'under'
                        ? 'var(--pos)'
                        : paceStatus === 'over'
                          ? 'var(--neg)'
                          : 'var(--ink-3)',
                  }}
                >
                  {paceStatus === 'under'
                    ? 'under pace'
                    : paceStatus === 'over'
                      ? 'over pace'
                      : 'on pace'}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <div
          className="flex items-center gap-1"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '3px 6px',
          }}
        >
          <button
            onClick={() => onNavigateMonth(-1)}
            className="btn ghost icon sm"
            aria-label="Previous month"
            style={{ padding: '2px 4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              chevron_left
            </span>
          </button>
          <span
            className="num text-[12px] font-semibold"
            style={{ color: 'var(--ink)', minWidth: 100, textAlign: 'center' }}
          >
            {monthLongLabel(month, mode)} {formatYearLabel(year, mode)}
          </span>
          <button
            onClick={() => onNavigateMonth(1)}
            className="btn ghost icon sm"
            aria-label="Next month"
            style={{ padding: '2px 4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              chevron_right
            </span>
          </button>
        </div>

        <Button variant="primary" size="sm" onClick={onAddClick}>
          + Add budget
        </Button>
      </div>
    </header>
  )
}
