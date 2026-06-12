import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCountUp } from '@/hooks/useCountUp'
import { formatCompact, formatCurrency } from '@/lib/format'

import { PIE_COLORS, TOOLTIP_STYLE } from '../lib/chartTheme'

interface CategoryDonutChartProps {
  data: { name: string; value: number }[]
  totalDebit: number
  currentMonthLabel: string
  year: number
  isLoading: boolean
}

const CATEGORY_CAP = 10
const OTHER_COLOR = 'var(--ink-4)'

export function CategoryDonutChart({
  data,
  totalDebit,
  currentMonthLabel,
  year,
  isLoading,
}: CategoryDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || totalDebit
  const totalAnim = useCountUp(total)

  // Consolidate the long tail into a single "Other" slice so the donut and
  // legend agree on what's visible. Donut keeps top N as separate slices.
  const displayData =
    data.length > CATEGORY_CAP
      ? [
          ...data.slice(0, CATEGORY_CAP),
          {
            name: 'Other',
            value: data.slice(CATEGORY_CAP).reduce((s, d) => s + d.value, 0),
          },
        ]
      : data

  const colorAt = (i: number, name: string) =>
    name === 'Other' ? OTHER_COLOR : PIE_COLORS[i % PIE_COLORS.length]

  return (
    <div className="flex h-full flex-col">
      <div className="section-head">
        <div>
          <div className="title">By category</div>
          <div className="sub">
            Where {currentMonthLabel} {year} went
          </div>
        </div>
      </div>

      <section className="card flex-1">
        {isLoading ? (
          <Skeleton className="h-52 w-full" />
        ) : data.length === 0 ? (
          <EmptyState icon="donut_large" title="No spending data" />
        ) : (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Donut + center overlay */}
            <div style={{ flex: '0 0 180px', position: 'relative', width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                    animationBegin={120}
                    animationDuration={650}
                    animationEasing="ease-out"
                  >
                    {displayData.map((d, i) => (
                      <Cell key={d.name} fill={colorAt(i, d.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => [formatCurrency(Number(v))]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <div className="lbl">Total</div>
                <div className="val">{formatCompact(totalAnim)}</div>
              </div>
            </div>

            {/* 4-col legend: swatch | name | pct | amount */}
            <div className="donut-legend">
              {displayData.map((d, i) => {
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
                const isOther = d.name === 'Other'
                const tailCount = data.length - CATEGORY_CAP
                return (
                  <div key={d.name} className="legend-row">
                    <span className="legend-swatch" style={{ background: colorAt(i, d.name) }} />
                    <span
                      className="legend-name"
                      style={isOther ? { color: 'var(--ink-3)', fontStyle: 'italic' } : undefined}
                      title={isOther ? `${tailCount} more categories` : undefined}
                    >
                      {isOther ? `Other (${tailCount})` : d.name}
                    </span>
                    <span className="legend-pct">{pct}%</span>
                    <span className="legend-amt">{formatCompact(d.value)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
