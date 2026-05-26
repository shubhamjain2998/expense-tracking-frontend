import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
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
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow mb-2">Budget · {formatYearLabel(year, mode)}</p>
        {!isLoading && hasEntries ? (
          <>
            <h1
              className="display num text-[var(--ink)]"
              style={{ fontSize: 'clamp(40px, 5.5vw, 64px)' }}
            >
              {formatCurrency(totalYTDSpent)}
            </h1>
            <p className="mt-3 text-[13px] text-[var(--ink-3)]">
              of <span className="num">{formatCurrency(totalAnnual)}</span> annual budget
              {paceStatus !== null && (
                <>
                  {' · '}
                  <span
                    className="font-medium"
                    style={{
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
          </>
        ) : (
          <h1
            className="display text-[var(--ink)]"
            style={{ fontSize: 'clamp(32px, 4.5vw, 48px)' }}
          >
            Annual allocation
          </h1>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="ym-nav">
          <button
            onClick={() => onNavigateMonth(-1)}
            className="btn ghost ym-nav-btn"
            aria-label="Previous month"
          >
            <Icon name="chevron_left" size={14} />
          </button>
          <span className="ym-nav-label num" style={{ minWidth: 110 }}>
            {monthLongLabel(month, mode)} {formatYearLabel(year, mode)}
          </span>
          <button
            onClick={() => onNavigateMonth(1)}
            className="btn ghost ym-nav-btn"
            aria-label="Next month"
          >
            <Icon name="chevron_right" size={14} />
          </button>
        </div>

        <Button variant="primary" size="sm" onClick={onAddClick}>
          + Add budget
        </Button>
      </div>
    </header>
  )
}
