import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'

import type { DowAverage, NextMonthForecast } from '../lib/forecast'

interface DowForecastSectionProps {
  dow: DowAverage[]
  forecast: NextMonthForecast
  /** Total monthly plan across categories for the forecast's target month —
   *  from the same budget lookup the heatmap uses. 0 when no budgets set. */
  plan: number
  isLoading: boolean
}

/**
 * Insights §4 — Which day, and what's next. Two cards: weekday averages
 * (`.dow` primitive) and next month's projection. No chart on the right
 * card — a second time-series would duplicate Home's trend (MASTER.md §1).
 */
export function DowForecastSection({ dow, forecast, plan, isLoading }: DowForecastSectionProps) {
  const maxAvg = Math.max(...dow.map((d) => d.avg), 1)
  const totalSpend = dow.reduce((s, d) => s + d.total, 0)
  const top2 = [...dow].sort((a, b) => b.avg - a.avg).slice(0, 2)
  const top2Share = totalSpend > 0 ? (top2.reduce((s, d) => s + d.total, 0) / totalSpend) * 100 : 0
  const lowest = dow.reduce(
    (min, d) => (d.avg < min.avg ? d : min),
    dow[0] ?? { label: '', avg: 0, total: 0 }
  )
  const top2Labels = top2.map((d) => d.label).join(' and ')

  const over = plan > 0 && forecast.projected > plan
  const meterPct = plan > 0 ? Math.min(100, (forecast.projected / plan) * 100) : 0
  const likely = forecast.projected - plan

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Which day, and what&rsquo;s next</h2>
        <span className="sub">Weekday averages over recent history, excluding rent and SIPs</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="dow">
                {dow.map((d) => (
                  <span key={d.label} className={d.avg >= maxAvg ? 'col peak' : 'col'}>
                    <i style={{ height: `${maxAvg > 0 ? (d.avg / maxAvg) * 100 : 0}%` }} />
                    <span>{d.label}</span>
                  </span>
                ))}
              </div>
              {totalSpend > 0 && (
                <p className="mt-4 text-[12.5px] text-[var(--ink-3)]">
                  {top2Labels} carry{' '}
                  <b className="num text-[var(--ink)]">{Math.round(top2Share)}%</b> of discretionary
                  spend. A {top2[0]?.label} averages{' '}
                  <b className="num text-[var(--ink)]">{formatCurrency(top2[0]?.avg ?? 0)}</b>{' '}
                  against <b className="num text-[var(--ink)]">{formatCurrency(lowest.avg)}</b> on a{' '}
                  {lowest.label}.
                </p>
              )}
            </>
          )}
        </div>

        <div className="card flex flex-col">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="card-head">
                <span className="font-medium text-[var(--ink)]">
                  What {forecast.label} is likely to cost
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <span className="money">
                  <span className="eyebrow">Projection</span>
                  <span className="v">{formatCurrency(forecast.projected)}</span>
                  <span className="text-[12.5px] text-[var(--ink-3)]">
                    {forecast.spread !== null ? `±${formatCompact(forecast.spread)} · ` : ''}
                    from {forecast.yearsOfHistory} year
                    {forecast.yearsOfHistory === 1 ? '' : 's'} of {forecast.label}-adjusted history
                  </span>
                </span>
                {plan > 0 && (
                  <div>
                    <div className="meter">
                      <i className={over ? 'over' : ''} style={{ width: `${meterPct}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between">
                      <span className="num text-[12.5px] text-[var(--ink-3)]">
                        plan {formatCurrency(plan)}
                      </span>
                      <span
                        className={['num text-[12.5px]', over ? 'neg' : 'text-[var(--ink-3)]'].join(
                          ' '
                        )}
                      >
                        {likely >= 0 ? '+' : '−'}
                        {formatCurrency(Math.abs(likely))} likely
                      </span>
                    </div>
                  </div>
                )}
                {forecast.pctVsAverage !== null && (
                  <p className="text-[12.5px] text-[var(--ink-3)]">
                    {forecast.label} has run{' '}
                    <b className={forecast.pctVsAverage >= 0 ? 'neg' : 'pos'}>
                      {Math.round(Math.abs(forecast.pctVsAverage) * 100)}%{' '}
                      {forecast.pctVsAverage >= 0 ? 'above' : 'below'}
                    </b>{' '}
                    the yearly average
                    {forecast.yearsOfHistory > 1
                      ? ` in each of the last ${forecast.yearsOfHistory} years`
                      : ''}
                    .
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
