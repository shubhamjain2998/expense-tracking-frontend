import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'
import { formatYearLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'

import type { YearVerdict } from '../types'

/**
 * Budget §1 "The year" — the hero. The ONLY place annual and year-to-date
 * figures appear anywhere in the app (MASTER.md §1, "one number, one
 * home"). Everything else on this page (and the rest of Kosh) either shows a
 * monthly figure or links back here instead of restating the annual total.
 */
export function BudgetHeader({
  year,
  mode,
  isLoading,
  hasEntries,
  totalYTDSpent,
  totalAnnual,
  paceStatus,
  monthsElapsed,
  yearVerdict,
  onNavigateYear,
  onAddClick,
}: {
  year: number
  mode: PeriodMode
  isLoading: boolean
  hasEntries: boolean
  totalYTDSpent: number
  totalAnnual: number
  paceStatus: 'under' | 'over' | 'on_track' | null
  monthsElapsed: number
  yearVerdict: YearVerdict
  onNavigateYear: (dir: -1 | 1) => void
  onAddClick: () => void
}) {
  const yearLabel = formatYearLabel(year, mode)
  const { pctUsed, pctYearLeft, diff } = yearVerdict
  const paceWord = paceStatus === 'over' ? 'over' : paceStatus === 'under' ? 'under' : 'on plan'

  return (
    <section>
      <div className="verdict">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="eyebrow">
            {yearLabel} · {monthsElapsed} of 12 months elapsed
          </p>

          {isLoading ? (
            <div className="animate-shimmer h-16 w-full max-w-xl rounded" />
          ) : !hasEntries || pctUsed === null ? (
            <p className="verdict-line">
              No plan set for {yearLabel} yet. Add a budget to see how this year is pacing.
            </p>
          ) : (
            <>
              <p className="verdict-line">
                You&rsquo;ve used <b className="num">{pctUsed.toFixed(1)}%</b> of the year&rsquo;s
                plan with <b className="num">{Math.round(pctYearLeft)}%</b> of the year left.
                {paceWord === 'on plan' ? (
                  <> At this rate you finish on plan.</>
                ) : (
                  <>
                    {' '}
                    At this rate you finish{' '}
                    <b className={paceWord === 'over' ? 'neg num' : 'num'}>
                      {formatCurrency(Math.abs(diff))} {paceWord}
                    </b>
                    .
                  </>
                )}
              </p>
              <div style={{ maxWidth: 620 }}>
                <div className="meter" style={{ height: 10 }}>
                  <i
                    className={paceStatus === 'over' ? 'over' : undefined}
                    style={{ width: `${Math.min(pctUsed, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between">
                  <span className="small num">{formatCurrency(totalYTDSpent)} spent</span>
                  <span className="small num">{formatCurrency(totalAnnual)} planned</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="eyebrow">Financial year</span>
          <div className="ym-nav">
            <button
              onClick={() => onNavigateYear(-1)}
              className="btn ghost ym-nav-btn"
              aria-label="Previous year"
            >
              <Icon name="chevron_left" size={14} />
            </button>
            <span className="ym-nav-label num">{yearLabel}</span>
            <button
              onClick={() => onNavigateYear(1)}
              className="btn ghost ym-nav-btn"
              aria-label="Next year"
            >
              <Icon name="chevron_right" size={14} />
            </button>
          </div>
          <button className="btn ghost sm" onClick={onAddClick}>
            + Add budget
          </button>
        </div>
      </div>
    </section>
  )
}
