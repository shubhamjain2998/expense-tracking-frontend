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
import { TOOLTIP_STYLE } from '@/features/dashboard/lib/chartTheme'
import { formatCurrency } from '@/lib/format'

import type { CategoryMonthPoint } from '../lib/categoryStats'

/** `YYYY-MM` — a unique x identity per point. The month name alone repeats
 *  over a 15-month window, and Recharts resolves a repeated category to its
 *  first occurrence, so hovering May 2026 reported May 2025's amount. */
function pointKey(p: CategoryMonthPoint): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}`
}

interface CategoryTrendChartProps {
  category: string
  series: CategoryMonthPoint[]
  isDark: boolean
  isLoading: boolean
  /** False in the 3D world, whose stage draws the columns instead; the
   *  heading and the screen-reader table stay. */
  showChart?: boolean
}

/** Same 5-tick / unit-normalised axis approach as Home's TrendBlock —
 *  duplicated locally (small, not exported there) rather than importing a
 *  Home-only internal. */
function niceAxisTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0]
  const rawStep = maxValue / 4
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = niceNormalized * magnitude
  return [0, step, step * 2, step * 3, step * 4]
}

function axisUnit(maxTick: number): { divisor: number; suffix: string; decimals: number } {
  if (maxTick >= 1e7) return { divisor: 1e7, suffix: 'Cr', decimals: 1 }
  if (maxTick >= 1e5) return { divisor: 1e5, suffix: 'L', decimals: 1 }
  if (maxTick >= 1e3) return { divisor: 1e3, suffix: 'k', decimals: 0 }
  return { divisor: 1, suffix: '', decimals: 0 }
}

function formatAxisTick(value: number, unit: ReturnType<typeof axisUnit>): string {
  if (value === 0) return '₹0'
  return `₹${(value / unit.divisor).toFixed(unit.decimals)}${unit.suffix}`
}

/**
 * That category's own trend — the ONE thing Home's all-category trend
 * can't show. Not a duplicate: Home's Trend block sums every category,
 * this is one series for one category (MASTER.md §1 — "one chart, one
 * question").
 */
export function CategoryTrendChart({
  category,
  series,
  isDark,
  isLoading,
  showChart = true,
}: CategoryTrendChartProps) {
  // Matches tokens.css --ink-3 for each theme (recharts sets these as SVG
  // presentation attributes, not CSS properties, so var(--ink-3) can't be
  // trusted to resolve — hex literals kept in step with the token by hand).
  const tickColor = isDark ? '#8E96A4' : '#5F6672'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  const rows = series.map((p) => ({ ...p, key: pointKey(p) }))
  const labelByKey = new Map(rows.map((p) => [p.key, p.label]))
  const yearByKey = new Map(rows.map((p) => [p.key, p.year]))

  const maxValue = series.reduce((m, p) => Math.max(m, p.amount), 0)
  const yTicks = niceAxisTicks(maxValue)
  const yDomainMax = yTicks[yTicks.length - 1] || 1
  const yUnit = axisUnit(yDomainMax)

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">
          {category} over {series.length} months
        </h2>
        <span className="sub">
          This category only · the dashboard trend shows every category together
        </span>
      </div>

      <div className={showChart ? 'card' : undefined}>
        {isLoading ? (
          showChart && <Skeleton className="h-56 w-full" />
        ) : (
          <>
            {showChart && (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="key"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: tickColor }}
                    padding={{ left: 8, right: 8 }}
                    interval="preserveStartEnd"
                    tickFormatter={(v) => labelByKey.get(String(v)) ?? String(v)}
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
                    formatter={(v) => [formatCurrency(Number(v)), category]}
                    labelFormatter={(v) => {
                      const key = String(v)
                      const label = labelByKey.get(key)
                      return label ? `${label} ${yearByKey.get(key)}` : key
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name={category}
                    stroke="var(--ink)"
                    strokeWidth={2.25}
                    dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--surface)', stroke: 'var(--ink)' }}
                    activeDot={{ r: 5.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Phase 9: sr-only moved to a wrapper div — see the matching
                comment in TrendBlock.tsx for why `.sr-only` on the
                `<table>` itself didn't visually hide it. */}
            <div className="sr-only">
              <table>
                <caption>{category} spend by month</caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((p) => (
                    <tr key={`${p.year}-${p.month}`}>
                      <td>
                        {p.label} {p.year}
                      </td>
                      <td>{formatCurrency(p.amount)}</td>
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
