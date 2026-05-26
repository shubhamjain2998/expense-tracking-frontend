import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatCompact } from '@/lib/format'
import type { SummaryRow } from '@/types/dashboard'

import { PIE_COLORS } from '../lib/chartTheme'

interface BudgetPaceBarsProps {
  budgetRows: SummaryRow[]
  paceAt: number
  dayOfMonth: number
  isLoading: boolean
}

export function BudgetPaceBars({ budgetRows, paceAt, dayOfMonth, isLoading }: BudgetPaceBarsProps) {
  return (
    <div>
      <div className="section-head">
        <div>
          <div className="title">Budget pace</div>
          <div className="sub">
            Where you're tracking against monthly limits, by day {dayOfMonth}
          </div>
        </div>
      </div>

      <section className="card">
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : budgetRows.length === 0 ? (
          <EmptyState
            icon="bar_chart"
            title="No data for this period"
            description="Upload a statement or set up your budget to get started."
          />
        ) : (
          <div className="pace-list">
            {budgetRows.map((row, idx) => {
              const allocated = Number(row.allocated_monthly)
              const actual = Math.max(0, Number(row.actual))
              const pctUsed = allocated > 0 ? actual / allocated : 0
              const expectedActual = allocated * paceAt
              const pctVsPace = expectedActual > 0 ? (actual / expectedActual - 1) * 100 : null

              // 10% buffer before flagging "hot" — minor overpace is noise, not a warning
              const status =
                actual > allocated ? 'over' : actual > expectedActual * 1.1 ? 'hot' : 'on-track'
              const fillClass = status === 'over' ? 'over' : status === 'hot' ? 'warn' : 'pos'

              return (
                <div key={row.category} className="pace-row">
                  <div className="pace-cat">
                    <span
                      className="swatch"
                      style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="name">{row.category}</span>
                  </div>

                  <div className="pace-bar">
                    <div
                      className={`pace-fill ${fillClass}`}
                      style={{ width: `${Math.min(pctUsed, 1) * 100}%` }}
                    />
                    {allocated > 0 && (
                      <div
                        className="pace-marker"
                        style={{ left: `${Math.min(paceAt, 1) * 100}%` }}
                      />
                    )}
                  </div>

                  <div
                    className={`pace-amount num${status === 'over' ? 'over' : ''}`}
                    title={
                      pctVsPace !== null
                        ? `${pctVsPace > 0 ? '+' : ''}${Math.round(pctVsPace)}% vs pace`
                        : undefined
                    }
                  >
                    {formatCompact(actual)}
                    {allocated > 0 && <span className="of"> / {formatCompact(allocated)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
