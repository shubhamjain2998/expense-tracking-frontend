import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'

import { PIE_COLORS, TOOLTIP_STYLE } from '../lib/chartTheme'

interface CategoryDonutChartProps {
  data: { name: string; value: number }[]
  totalDebit: number
  currentMonthLabel: string
  year: number
  isLoading: boolean
}

export function CategoryDonutChart({
  data,
  totalDebit,
  currentMonthLabel,
  year,
  isLoading,
}: CategoryDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || totalDebit

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
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
                <div className="val">{formatCompact(total)}</div>
              </div>
            </div>

            {/* 4-col legend: swatch | name | pct | amount */}
            <div className="donut-legend">
              {data.slice(0, 7).map((d, i) => {
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
                return (
                  <div key={d.name} className="legend-row">
                    <span
                      className="legend-swatch"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="legend-name">{d.name}</span>
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
