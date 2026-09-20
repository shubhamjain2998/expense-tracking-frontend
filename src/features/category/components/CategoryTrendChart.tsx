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

interface CategoryTrendChartProps {
  category: string
  series: CategoryMonthPoint[]
  isDark: boolean
  isLoading: boolean
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
}: CategoryTrendChartProps) {
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

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

      <div className="card">
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  padding={{ left: 8, right: 8 }}
                  interval="preserveStartEnd"
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

            <table className="sr-only">
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
          </>
        )}
      </div>
    </section>
  )
}
