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
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Categories eating your budget</p>
          <p className="card-sub">
            Ranked by share of monthly allocation spent · pace marker shows expected burn for day{' '}
            {dayOfMonth}
          </p>
        </div>

        {/* Status legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 11,
            color: 'var(--ink-4)',
            flexShrink: 0,
          }}
        >
          {(['on track', 'hot', 'over'] as const).map((s) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  display: 'inline-block',
                  background:
                    s === 'over' ? 'var(--neg)' : s === 'hot' ? 'var(--warn)' : 'var(--pos)',
                }}
              />
              {s}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 1.5,
                height: 12,
                background: 'var(--ink)',
                opacity: 0.3,
                display: 'inline-block',
              }}
            />
            pace
          </span>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : budgetRows.length === 0 ? (
        <EmptyState
          icon="bar_chart"
          title="No data for this period"
          description="Upload a statement or set up your budget to get started."
        />
      ) : (
        <div>
          {budgetRows.map((row, idx) => {
            const allocated = Number(row.allocated_monthly)
            const actual = Math.max(0, Number(row.actual))
            const pctUsed = allocated > 0 ? actual / allocated : 0
            const expectedActual = allocated * paceAt
            const pctVsPace = expectedActual > 0 ? (actual / expectedActual - 1) * 100 : null

            // 10% buffer before flagging "hot" — minor overpace is noise, not a warning
            const status =
              actual > allocated ? 'over' : actual > expectedActual * 1.1 ? 'hot' : 'on-track'
            const fillColor =
              status === 'over' ? 'var(--neg)' : status === 'hot' ? 'var(--warn)' : 'var(--pos)'

            return (
              <div
                key={row.category}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '8px 0',
                  borderBottom: idx < budgetRows.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                {/* Label: color dot, category name, status chip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    width: 190,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: PIE_COLORS[idx % PIE_COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--ink)',
                      fontWeight: 500,
                      flex: 1,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.category}
                  </span>
                  {status !== 'on-track' && (
                    <span
                      className={`chip ${status === 'over' ? 'neg' : 'warn'}`}
                      style={{ height: 18, fontSize: 10, padding: '0 6px', flexShrink: 0 }}
                    >
                      {status}
                    </span>
                  )}
                </div>

                {/* Progress bar with pace marker tick */}
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    height: 5,
                    background: 'var(--surface-3)',
                    borderRadius: 2,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(pctUsed, 1) * 100}%`,
                      background: fillColor,
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }}
                  />
                  {/* Vertical tick at today's expected pace position */}
                  {allocated > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -3,
                        bottom: -3,
                        left: `${Math.min(paceAt, 1) * 100}%`,
                        width: 1.5,
                        background: 'var(--ink)',
                        opacity: 0.3,
                      }}
                    />
                  )}
                </div>

                {/* Amounts and pace delta */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexShrink: 0 }}>
                  <span
                    className="num"
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink)',
                      fontWeight: 500,
                      minWidth: 140,
                      textAlign: 'right',
                    }}
                  >
                    {formatCompact(actual)}
                    {allocated > 0 ? ` / ${formatCompact(allocated)}` : ''}
                  </span>
                  {pctVsPace !== null && (
                    <span
                      className="num"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: pctVsPace > 0 ? 'var(--neg)' : 'var(--pos)',
                        minWidth: 84,
                        textAlign: 'right',
                      }}
                    >
                      {pctVsPace > 0 ? '+' : ''}
                      {Math.round(pctVsPace)}% vs pace
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
