import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'

import { axisUnit, formatAxisTick, niceAxisTicks } from '../lib/chartAxis'
import { TOOLTIP_STYLE } from '../lib/chartTheme'
import type { IncomeExpenseTrendPoint } from '../types'

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

interface TrendBlockProps {
  incomeTrendData: IncomeExpenseTrendPoint[]
  trendWindow: number
  onTrendWindowChange: (w: number) => void
  isLoading: boolean
  isDark: boolean
  /** False when the 3D world on Home draws the series instead of the line chart. */
  showChart?: boolean
}

const WINDOW_OPTIONS = [6, 12, 15] as const

/** "2026-05" → "May". The axis stays short; the tooltip carries the year. */
function monthLabel(key: string): string {
  const [, month] = key.split('-')
  return SHORT_MONTHS[Number(month) - 1] ?? key
}

/** "2026-05" → "May 2026", for the tooltip and the screen-reader table, where
 *  two identically-named months must be told apart. */
function monthAndYearLabel(key: string): string {
  const [year, month] = key.split('-')
  const name = SHORT_MONTHS[Number(month) - 1]
  return name ? `${name} ${year}` : key
}

/**
 * Block 4 — Trend. "Is this month normal?"
 * The only month-by-month series on Home (the year block is cumulative).
 * One line chart, in vs out, with a
 * 6/12/15-month window toggle — replaces SixMonthTrend, IncomeFlowAndTrend
 * and the seasonality arc (15m is one of the windows now).
 */
export function TrendBlock({
  incomeTrendData,
  trendWindow,
  onTrendWindowChange,
  isLoading,
  isDark,
  showChart = true,
}: TrendBlockProps) {
  // Matches tokens.css --ink-3 for each theme (recharts sets these as SVG
  // presentation attributes, not CSS properties, so var(--ink-3) can't be
  // trusted to resolve — hex literals kept in step with the token by hand).
  const tickColor = isDark ? '#8E96A4' : '#5F6672'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  const avgExpense =
    incomeTrendData.length > 0
      ? incomeTrendData.reduce((s, p) => s + p.expense, 0) / incomeTrendData.length
      : 0
  const last = incomeTrendData.at(-1)
  const lastExpense = last?.expense ?? 0
  // A month with nothing recorded (a future or unimported one) isn't "down
  // 100%": there's nothing to compare yet.
  const lastIsEmpty = !last || (last.expense === 0 && last.income === 0)
  const vsAvgPct =
    avgExpense > 0 && !lastIsEmpty ? ((lastExpense - avgExpense) / avgExpense) * 100 : null

  const maxSeriesValue = incomeTrendData.reduce((m, p) => Math.max(m, p.income, p.expense), 0)
  const yTicks = niceAxisTicks(maxSeriesValue)
  const yDomainMax = yTicks[yTicks.length - 1] || 1
  const yUnit = axisUnit(yDomainMax)

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Trend</h2>
        <span className="sub">Monthly totals · in vs out</span>
        <span className="act">
          <span className="seg">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                className={trendWindow === w ? 'on' : ''}
                aria-pressed={trendWindow === w}
                onClick={() => onTrendWindowChange(w)}
              >
                {w}m
              </button>
            ))}
          </span>
        </span>
      </div>

      <div className="card">
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <>
            {/* The Out/In key describes the line chart. Without it (the 3D
                world draws ribbons with their own legend) a solid/dashed key
                was wrong, and its margin left a gap under the average line. */}
            <div
              className={['flex flex-wrap items-center gap-4', showChart ? 'mb-3' : null]
                .filter(Boolean)
                .join(' ')}
            >
              {showChart && (
                <>
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink)]">
                    <svg width="16" height="8" aria-hidden="true">
                      <line x1="0" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth={2} />
                    </svg>
                    Out
                  </span>
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--accent)]">
                    <svg width="16" height="8" aria-hidden="true">
                      <line
                        x1="0"
                        y1="4"
                        x2="16"
                        y2="4"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                    </svg>
                    In
                  </span>
                </>
              )}
              {vsAvgPct !== null && (
                <span
                  className={['text-[12.5px] text-[var(--ink-3)]', showChart ? 'sm:ml-auto' : null]
                    .filter(Boolean)
                    .join(' ')}
                >
                  Out is {vsAvgPct >= 0 ? 'up' : 'down'}{' '}
                  <b className={vsAvgPct >= 0 ? 'neg' : 'pos'}>{Math.abs(Math.round(vsAvgPct))}%</b>{' '}
                  against your {trendWindow}-month average
                </span>
              )}
              {vsAvgPct === null && lastIsEmpty && avgExpense > 0 && (
                <span
                  className={['text-[12.5px] text-[var(--ink-3)]', showChart ? 'sm:ml-auto' : null]
                    .filter(Boolean)
                    .join(' ')}
                >
                  Nothing recorded this month yet, so no comparison
                </span>
              )}
            </div>

            {showChart && (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={incomeTrendData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                  {/* Keyed on `key` (YYYY-MM), not on the month name: past 12
                    months the name repeats, and Recharts resolves a repeated
                    category to its first occurrence, so the tooltip showed the
                    older month's figures. Ticks stay short via the formatter. */}
                  <XAxis
                    dataKey="key"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: tickColor }}
                    padding={{ left: 8, right: 8 }}
                    tickFormatter={(v) => monthLabel(String(v))}
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
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(v) => monthAndYearLabel(String(v))}
                    formatter={(v, name) => [
                      formatCurrency(Number(v)),
                      name === 'income' ? 'In' : 'Out',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="expense"
                    stroke="var(--ink)"
                    strokeWidth={2.25}
                    dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--surface)', stroke: 'var(--ink)' }}
                    activeDot={{ r: 5.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="income"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    // Recharts hands the line's dash pattern to its dots, and a
                    // 3px circle drawn with a "5 4" dash reads as a broken
                    // glyph at each point. Dots are drawn solid, filled with
                    // the surface like Out's (recharts' default is white,
                    // which glared in dark mode).
                    dot={{ r: 3, strokeDasharray: 'none', fill: 'var(--surface)' }}
                    activeDot={{ r: 5.5, strokeDasharray: 'none' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Phase 9: `.sr-only` on the `<table>` itself didn't visually
                hide it — CSS 2.1's auto table-layout algorithm treats a
                specified `width` as a *minimum*, so `width: 1px` couldn't
                shrink it (measured ~172x174px live, `table-layout: fixed`
                didn't fix it either since the browser was still sizing
                from cell content in practice). A plain `<div>` doesn't have
                that table-sizing quirk, so the sr-only treatment moves to
                a wrapper instead of the table itself. */}
            <div className="sr-only">
              <table>
                <caption>Monthly money in and out</caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>In</th>
                    <th>Out</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeTrendData.map((p) => (
                    <tr key={p.key}>
                      <td>{monthAndYearLabel(p.key)}</td>
                      <td>{formatCurrency(p.income)}</td>
                      <td>{formatCurrency(p.expense)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
