import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'
import type { PeriodMode } from '@/lib/period'
import { formatYearLabel, monthShortLabel } from '@/lib/period'

import { axisUnit, formatAxisTick, niceAxisTicks } from '../lib/chartAxis'
import { TOOLTIP_STYLE } from '../lib/chartTheme'
import type { YearOutlook, YearOutlookPoint, YearTotals } from '../lib/yearOutlook'

interface YearBlockProps {
  outlook: YearOutlook
  /** Sum of the year's category plans; 0 when no plan is set. */
  annualPlan: number
  year: number
  mode: PeriodMode
  monthsElapsed: number
  isLoading: boolean
  isDark: boolean
}

function TotalsRow({ totals, label }: { totals: YearTotals; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      <div className="money-row">
        <span className="money">
          <span className="eyebrow">In</span>
          <span className="v pos">{formatCurrency(totals.income)}</span>
        </span>
        <span className="money">
          <span className="eyebrow">Out</span>
          <span className="v">{formatCurrency(totals.expense)}</span>
        </span>
        <span className="money">
          <span className="eyebrow">Saved</span>
          <span className={['v', totals.saved < 0 ? 'neg' : null].filter(Boolean).join(' ')}>
            {formatCurrency(totals.saved)}
          </span>
          {totals.savingsRate !== null && (
            <span className="text-[12.5px] text-[var(--ink-3)]">
              {totals.savingsRate}% of income
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

interface TooltipPayloadEntry {
  payload?: YearOutlookPoint
}

/** One row per series. At the month where actual and projected meet, the
 *  actual figure wins so the same number isn't listed twice. */
function OutlookTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}) {
  const p = payload?.[0]?.payload
  if (!active || !p) return null
  const projected = p.outActual === null
  const out = p.outActual ?? p.outProjected
  const inn = p.inActual ?? p.inProjected
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="mb-1 font-semibold">
        {p.label}
        {projected ? ' · projected' : ''}
      </div>
      {inn !== null && <div>In so far: {formatCurrency(inn)}</div>}
      {out !== null && <div>Out so far: {formatCurrency(out)}</div>}
    </div>
  )
}

/**
 * Block 3 — The year. "Where does this year land?"
 * Cumulative in and out from the first month of the year to today, then a
 * projection to year end at the pace of the completed months. The totals
 * above the chart are the chart's own end points: where the actual lines
 * stop, and where the projected lines finish.
 */
export function YearBlock({
  outlook,
  annualPlan,
  year,
  mode,
  monthsElapsed,
  isLoading,
  isDark,
}: YearBlockProps) {
  // Same hand-synced hex literals as TrendBlock — recharts writes SVG
  // presentation attributes, where var(--ink-3) can't be trusted to resolve.
  const tickColor = isDark ? '#8E96A4' : '#5F6672'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  const { points, soFar, yearEnd, monthlyPace } = outlook
  const yearLabel = formatYearLabel(year, mode)
  const lastMonth = monthShortLabel(12, mode)

  const maxSeriesValue = points.reduce(
    (m, p) =>
      Math.max(m, p.outActual ?? 0, p.inActual ?? 0, p.outProjected ?? 0, p.inProjected ?? 0),
    annualPlan
  )
  const yTicks = niceAxisTicks(maxSeriesValue)
  const yDomainMax = yTicks[yTicks.length - 1] || 1
  const yUnit = axisUnit(yDomainMax)

  const status =
    monthsElapsed === 0
      ? 'Not started yet'
      : monthsElapsed === 12
        ? 'Full year'
        : `${monthsElapsed} of 12 months · projected to ${lastMonth}`

  const planGap = yearEnd && annualPlan > 0 ? annualPlan - yearEnd.expense : null
  const hasData = soFar.income > 0 || soFar.expense > 0

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">The year</h2>
        <span className="sub">
          {yearLabel} · {status}
        </span>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-8">
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 w-24" />
            </div>
            <Skeleton className="h-56 w-full" />
          </div>
        ) : !hasData ? (
          <EmptyState
            title={`Nothing recorded in ${yearLabel} yet`}
            description="Import a statement and the year's running total and projection appear here."
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-x-14 gap-y-5">
              <TotalsRow totals={soFar} label={monthsElapsed === 12 ? 'The year' : 'So far'} />
              {yearEnd && <TotalsRow totals={yearEnd} label={`By ${lastMonth}, at this pace`} />}
            </div>

            {(monthlyPace || planGap !== null) && (
              <p className="mb-4 text-[12.5px] text-[var(--ink-3)]">
                {monthlyPace && (
                  <>
                    Assumes{' '}
                    <b className="num text-[var(--ink-2)]">
                      {formatCurrency(Math.round(monthlyPace.expense))}
                    </b>{' '}
                    out and{' '}
                    <b className="num text-[var(--ink-2)]">
                      {formatCurrency(Math.round(monthlyPace.income))}
                    </b>{' '}
                    in for each month left.
                  </>
                )}
                {planGap !== null && (
                  <>
                    {' '}
                    Against a plan of{' '}
                    <b className="num text-[var(--ink-2)]">{formatCurrency(annualPlan)}</b>, that
                    finishes{' '}
                    <b className={['num', planGap < 0 ? 'neg' : 'pos'].join(' ')}>
                      {formatCurrency(Math.abs(planGap))} {planGap < 0 ? 'over' : 'under'}
                    </b>
                    .
                  </>
                )}
              </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink)]">
                <svg width="16" height="8" aria-hidden="true">
                  <line x1="0" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth={2} />
                </svg>
                Out
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--accent)]">
                <svg width="16" height="8" aria-hidden="true">
                  <line x1="0" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth={2} />
                </svg>
                In
              </span>
              {yearEnd && (
                <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--ink-3)]">
                  <svg width="16" height="8" aria-hidden="true">
                    <line
                      x1="0"
                      y1="4"
                      x2="16"
                      y2="4"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                  </svg>
                  Projected
                </span>
              )}
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: tickColor }}
                  domain={[0, yDomainMax]}
                  ticks={yTicks}
                  tickFormatter={(v) => formatAxisTick(Number(v), yUnit)}
                  width={54}
                />
                <Tooltip
                  cursor={{ stroke: tickColor, strokeDasharray: '3 4', strokeOpacity: 0.5 }}
                  content={<OutlookTooltip />}
                />
                {annualPlan > 0 && (
                  <ReferenceLine
                    y={annualPlan}
                    stroke={tickColor}
                    strokeDasharray="2 4"
                    label={{
                      value: 'Plan',
                      position: 'insideTopLeft',
                      fontSize: 10,
                      fill: tickColor,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="outActual"
                  stroke="var(--ink)"
                  strokeWidth={2.25}
                  dot={{ r: 3, strokeWidth: 2, fill: 'var(--surface)', stroke: 'var(--ink)' }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="inActual"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="outProjected"
                  stroke="var(--ink)"
                  strokeOpacity={0.5}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="inProjected"
                  stroke="var(--accent)"
                  strokeOpacity={0.5}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* sr-only on a wrapping div, not the table — see TrendBlock. */}
            <div className="sr-only">
              <table>
                <caption>Money in and out over the year, cumulative</caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>In so far</th>
                    <th>Out so far</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => {
                    const projected = p.outActual === null
                    const inn = p.inActual ?? p.inProjected
                    const out = p.outActual ?? p.outProjected
                    if (inn === null || out === null) return null
                    return (
                      <tr key={p.periodMonth}>
                        <td>
                          {p.label}
                          {projected ? ' (projected)' : ''}
                        </td>
                        <td>{formatCurrency(inn)}</td>
                        <td>{formatCurrency(out)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
