import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'

import { PIE_COLORS, TOOLTIP_STYLE } from '../lib/chartTheme'

export type TrendMode = 'stacked' | 'total'

interface SixMonthTrendProps {
  stackedTrendData: Record<string, number | string>[]
  stackCategories: string[]
  trendMode: TrendMode
  onTrendModeChange: (mode: TrendMode) => void
  isLoading: boolean
  isDark: boolean
}

const SUBTITLES: Record<TrendMode, string> = {
  stacked: 'Monthly spend by category',
  total: 'Total spend per month',
}

export function SixMonthTrend({
  stackedTrendData,
  stackCategories,
  trendMode,
  onTrendModeChange,
  isLoading,
  isDark,
}: SixMonthTrendProps) {
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'

  // Tooltip name lookup — keeps `_total` out of the user-facing label.
  const labelFor = (name: string) => (name === '_total' ? 'Total' : name)

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="title">Spend by category</div>
          <div className="sub">{SUBTITLES[trendMode]}</div>
        </div>
        <div className="right">
          <div className="seg">
            <button
              className={trendMode === 'stacked' ? 'on' : ''}
              onClick={() => onTrendModeChange('stacked')}
            >
              Stacked
            </button>
            <button
              className={trendMode === 'total' ? 'on' : ''}
              onClick={() => onTrendModeChange('total')}
            >
              Total
            </button>
          </div>
        </div>
      </div>

      <section className="card">
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stackedTrendData}
              barSize={trendMode === 'total' ? 32 : 38}
              margin={{ top: 24, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: tickColor }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: tickColor }}
                tickFormatter={formatCompact}
                width={50}
              />
              <Tooltip
                cursor={{ fill: gridStroke }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [formatCurrency(Number(v)), labelFor(String(name))]}
              />

              {trendMode === 'stacked' ? (
                stackCategories.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="a"
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                    // Only the topmost bar in the stack gets rounded corners
                    radius={i === stackCategories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  />
                ))
              ) : (
                <Bar dataKey="_total" fill="var(--accent)" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="_total"
                    position="top"
                    formatter={(v: unknown) => formatCompact(Number(v))}
                    style={{
                      fontSize: 10.5,
                      fill: 'var(--ink-2)',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Category legend — only relevant in stacked mode */}
        {trendMode === 'stacked' && stackCategories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', marginTop: 12 }}>
            {stackCategories.map((cat, i) => (
              <span
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  color: tickColor,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: PIE_COLORS[i % PIE_COLORS.length],
                    flexShrink: 0,
                  }}
                />
                {cat}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
