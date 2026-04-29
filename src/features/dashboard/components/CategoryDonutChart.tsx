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
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">
            Category spending · {currentMonthLabel} {year}
          </p>
          <p className="card-sub">Share of this month's spend after splits</p>
        </div>
        <span className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {formatCompact(totalDebit)}
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-52 w-full" />
      ) : data.length === 0 ? (
        <EmptyState icon="donut_large" title="No spending data" />
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* Donut */}
          <div style={{ flex: '0 0 180px', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
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
          </div>

          {/* Inline legend — cap at 7 items to avoid overflow */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              overflow: 'hidden',
            }}
          >
            {data.slice(0, 7).map((d, i) => (
              <div
                key={d.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: PIE_COLORS[i % PIE_COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {d.name}
                  </span>
                </div>
                <span
                  className="num"
                  style={{ fontSize: 12, color: 'var(--ink-2)', flexShrink: 0 }}
                >
                  {formatCompact(d.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
