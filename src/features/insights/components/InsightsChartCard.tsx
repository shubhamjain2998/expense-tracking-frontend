import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PIE_COLORS, TOOLTIP_STYLE } from '@/features/dashboard/lib/chartTheme'
import { formatCompact } from '@/lib/format'

import type { InsightsChart } from '../lib/insightsResponseSchema'

interface InsightsChartCardProps {
  chart: InsightsChart
  isDark: boolean
}

function formatChartValue(value: number, unit?: string): string {
  if (!unit || unit.toUpperCase() === 'INR') return formatCompact(value)
  if (unit === '%') return `${value}%`
  return `${value} ${unit}`
}

/** Two series whose peaks differ by this much cannot share one axis — the
 *  smaller one flattens onto the baseline and reads as zero. The prompt asks
 *  the LLM for relationship charts (price vs count, spend vs income), which
 *  is exactly the case where the two series have different magnitudes. */
const DUAL_AXIS_RATIO = 8

function seriesPeak(series: InsightsChart['series'][number]): number {
  return Math.max(...series.data.map((p) => Math.abs(p.value)))
}

function needsDualAxis(chart: InsightsChart): boolean {
  if (chart.series.length !== 2) return false
  const peaks = chart.series.map(seriesPeak)
  if (peaks.some((p) => !Number.isFinite(p) || p === 0)) return false
  return Math.max(...peaks) / Math.min(...peaks) >= DUAL_AXIS_RATIO
}

/**
 * Union every series' labels into one row-per-position table — what
 * Bar/Line/Area need. A label missing from a given series is simply left
 * undefined for that series' key (Recharts draws a gap).
 *
 * Rows are keyed by the label's *occurrence*, not the label itself: a
 * 15-month series legitimately says "Aug" twice, and matching on the bare
 * label would merge those two months into one row and silently drop a
 * point. The axis still shows the plain label via a formatter, and the
 * repeated occurrences stay distinct rows.
 */
function toRows(chart: InsightsChart): Record<string, number | string>[] {
  const occurrenceKey = (label: string, index: number) => `${label}\u0000${index}`

  /** Per series: occurrence key → value, so "Aug" the second time is its own
   *  entry rather than overwriting the first. */
  const valuesBySeries = chart.series.map((s) => {
    const seenCount = new Map<string, number>()
    const values = new Map<string, number>()
    for (const p of s.data) {
      const index = seenCount.get(p.label) ?? 0
      seenCount.set(p.label, index + 1)
      values.set(occurrenceKey(p.label, index), p.value)
    }
    return values
  })

  const keys: string[] = []
  const labelForKey = new Map<string, string>()
  for (const values of valuesBySeries) {
    for (const key of values.keys()) {
      if (labelForKey.has(key)) continue
      labelForKey.set(key, key.split('\u0000')[0])
      keys.push(key)
    }
  }

  return keys.map((key) => {
    const row: Record<string, number | string> = { key, label: labelForKey.get(key) ?? key }
    chart.series.forEach((s, seriesIndex) => {
      const value = valuesBySeries[seriesIndex].get(key)
      if (value !== undefined) row[s.name] = value
    })
    return row
  })
}

/**
 * Renders one LLM-specified chart spec. The LLM never gets to invent a
 * chart type the app can't draw — the parser (insightsResponseSchema.ts)
 * already rejected anything outside bar/line/pie/area before this ever
 * mounts. Colour comes only from the greyscale ramp + accent
 * (design-system/kosh-ledger/MASTER.md §2/§6) — series labels/values are
 * untrusted strings, rendered as text only, never as markup.
 */
export function InsightsChartCard({ chart, isDark }: InsightsChartCardProps) {
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const rows = toRows(chart)
  const dualAxis = needsDualAxis(chart)
  const axisIdFor = (index: number) => (dualAxis && index === 1 ? 'right' : 'left')
  const showLegend = chart.type !== 'pie' && chart.series.length > 1
  const legend = showLegend ? (
    <Legend wrapperStyle={{ fontSize: 11, color: tickColor }} iconSize={9} />
  ) : null
  // The second axis carries whatever the first doesn't — usually a count, so
  // it never takes the chart's (single, money) unit. `formatCompact` prefixes
  // ₹, which would print an order count as "₹18".
  const secondaryAxis = dualAxis ? (
    <YAxis
      yAxisId="right"
      orientation="right"
      axisLine={false}
      tickLine={false}
      tick={{ fontSize: 10, fill: tickColor }}
      tickFormatter={(v) => Number(v).toLocaleString('en-IN')}
      width={44}
    />
  ) : null

  return (
    <div className="card">
      <p className="card-title">{chart.title}</p>
      {chart.takeaway && (
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-3)]">{chart.takeaway}</p>
      )}
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={220}>
          {chart.type === 'pie' ? (
            <PieChart>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => formatChartValue(Number(v), chart.unit)}
                labelFormatter={(v) => String(v).split('\u0000')[0]}
              />
              <Pie
                data={chart.series[0]?.data.map((p) => ({ name: p.label, value: p.value })) ?? []}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label={(entry: { name?: string }) => entry.name ?? ''}
              >
                {(chart.series[0]?.data ?? []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : chart.type === 'line' ? (
            <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
              <XAxis
                dataKey="key"
                tickFormatter={(v) => String(v).split('\u0000')[0]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: tickColor }}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: tickColor }}
                tickFormatter={(v) => formatChartValue(Number(v), chart.unit)}
                width={54}
              />
              {secondaryAxis}
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => formatChartValue(Number(v), chart.unit)}
                labelFormatter={(v) => String(v).split('\u0000')[0]}
              />
              {legend}
              {chart.series.map((s, i) => (
                <Line
                  key={s.name}
                  yAxisId={axisIdFor(i)}
                  type="monotone"
                  dataKey={s.name}
                  stroke={PIE_COLORS[i % PIE_COLORS.length]}
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          ) : chart.type === 'area' ? (
            <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
              <XAxis
                dataKey="key"
                tickFormatter={(v) => String(v).split('\u0000')[0]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: tickColor }}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: tickColor }}
                tickFormatter={(v) => formatChartValue(Number(v), chart.unit)}
                width={54}
              />
              {secondaryAxis}
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => formatChartValue(Number(v), chart.unit)}
                labelFormatter={(v) => String(v).split('\u0000')[0]}
              />
              {legend}
              {chart.series.map((s, i) => (
                <Area
                  key={s.name}
                  yAxisId={axisIdFor(i)}
                  type="monotone"
                  dataKey={s.name}
                  stroke={PIE_COLORS[i % PIE_COLORS.length]}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
              <XAxis
                dataKey="key"
                tickFormatter={(v) => String(v).split('\u0000')[0]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: tickColor }}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: tickColor }}
                tickFormatter={(v) => formatChartValue(Number(v), chart.unit)}
                width={54}
              />
              {secondaryAxis}
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => formatChartValue(Number(v), chart.unit)}
                labelFormatter={(v) => String(v).split('\u0000')[0]}
              />
              {legend}
              {chart.series.map((s, i) => (
                <Bar
                  key={s.name}
                  yAxisId={axisIdFor(i)}
                  dataKey={s.name}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>

        <div className="sr-only">
          <table>
            <caption>{chart.title}</caption>
            <thead>
              <tr>
                <th>Label</th>
                {chart.series.map((s) => (
                  <th key={s.name}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.label)}>
                  <td>{row.label}</td>
                  {chart.series.map((s) => (
                    <td key={s.name}>
                      {typeof row[s.name] === 'number'
                        ? formatChartValue(row[s.name] as number, chart.unit)
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
