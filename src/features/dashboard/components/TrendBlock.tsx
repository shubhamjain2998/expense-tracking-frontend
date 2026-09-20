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
import { formatCompact, formatCurrency } from '@/lib/format'

import { TOOLTIP_STYLE } from '../lib/chartTheme'
import type { IncomeExpenseTrendPoint } from '../types'

interface TrendBlockProps {
  incomeTrendData: IncomeExpenseTrendPoint[]
  trendWindow: number
  onTrendWindowChange: (w: number) => void
  isLoading: boolean
  isDark: boolean
}

const WINDOW_OPTIONS = [6, 12, 15] as const

/**
 * Block 4 — Trend. "Is this month normal?"
 * The ONLY time-series on Home. One line chart, in vs out, with a
 * 6/12/15-month window toggle — replaces SixMonthTrend, IncomeFlowAndTrend
 * and the seasonality arc (15m is one of the windows now).
 */
export function TrendBlock({
  incomeTrendData,
  trendWindow,
  onTrendWindowChange,
  isLoading,
  isDark,
}: TrendBlockProps) {
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  const avgExpense =
    incomeTrendData.length > 0
      ? incomeTrendData.reduce((s, p) => s + p.expense, 0) / incomeTrendData.length
      : 0
  const lastExpense = incomeTrendData.at(-1)?.expense ?? 0
  const vsAvgPct = avgExpense > 0 ? ((lastExpense - avgExpense) / avgExpense) * 100 : null

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
            <div className="mb-3 flex flex-wrap items-center gap-4">
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
              {vsAvgPct !== null && (
                <span className="text-[12.5px] text-[var(--ink-3)] sm:ml-auto">
                  Out is {vsAvgPct >= 0 ? 'up' : 'down'}{' '}
                  <b className={vsAvgPct >= 0 ? 'neg' : 'pos'}>{Math.abs(Math.round(vsAvgPct))}%</b>{' '}
                  against your {trendWindow}-month average
                </span>
              )}
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={incomeTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickFormatter={formatCompact}
                  width={50}
                />
                <Tooltip
                  cursor={{ stroke: tickColor, strokeDasharray: '3 4', strokeOpacity: 0.5 }}
                  contentStyle={TOOLTIP_STYLE}
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
                  dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--surface)', stroke: 'var(--accent)' }}
                  activeDot={{ r: 5.5 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <table className="sr-only">
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
                  <tr key={p.month}>
                    <td>{p.month}</td>
                    <td>{formatCurrency(p.income)}</td>
                    <td>{formatCurrency(p.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  )
}
