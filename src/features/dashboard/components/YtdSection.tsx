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

import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'
import type { TrendDataPoint } from '@/types/dashboard'

import { MONTH_LABELS_FULL, TOOLTIP_STYLE } from '../lib/chartTheme'
import type { YtdComputedData, YtdDataPoint } from '../types'

import { YtdIncomeBreakdown } from './YtdIncomeBreakdown'
import { YtdMonthlyHighlights } from './YtdMonthlyHighlights'

interface YtdSectionProps {
  yearlyTrendData: TrendDataPoint[]
  month: number
  yearLabel: string
  isDark: boolean
  ytdSpentTotal: number
  annualBudget: number
  projectedFY: number
  ytdLineData: YtdDataPoint[]
  ytdComputed: YtdComputedData
  isLoading: boolean
}

export function YtdSection({
  month,
  yearLabel,
  isDark,
  ytdSpentTotal,
  annualBudget,
  projectedFY,
  ytdLineData,
  ytdComputed,
  isLoading,
}: YtdSectionProps) {
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const hasBudget = annualBudget > 0
  const monthName = (pm: number) => MONTH_LABELS_FULL[pm] ?? `M${pm}`

  const {
    ytdIncomeTotal,
    ytdSaved,
    savingsRate,
    projectedFYSavings,
    projectedFYSavingsRate,
    totalExpenseCount,
    momPct,
    avgExpense,
    highestMonth,
    lowestMonth,
    bestSavingsMonth,
    incomeMonthlyAvg,
    spentMonthlyAvg,
    budgetPace,
    ytdIncomeSources,
    expenseCategories,
    maxExpense,
    monthlyStats,
  } = ytdComputed

  const expenseMonths = monthlyStats.filter((m) => m.expense > 0)

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 20px',
          borderBottom: '1px solid var(--line)',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
            Year-to-date · {yearLabel}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
            {month} month{month !== 1 ? 's' : ''} elapsed
            {totalExpenseCount > 0 && ` · ${totalExpenseCount} expenses`}
            {momPct !== null && (
              <>
                {' · '}
                <span
                  style={{
                    color: momPct < 0 ? 'var(--pos)' : momPct > 0 ? 'var(--neg)' : 'var(--ink-4)',
                  }}
                >
                  {momPct > 0 ? '+' : ''}
                  {momPct}% MoM
                </span>
                {' on last full month'}
              </>
            )}
          </span>
        </div>
        {budgetPace !== null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 20,
              background:
                budgetPace > 110
                  ? 'var(--neg-soft)'
                  : budgetPace > 95
                    ? 'var(--accent-soft)'
                    : 'var(--pos-soft)',
              color:
                budgetPace > 110 ? 'var(--neg)' : budgetPace > 95 ? 'var(--accent)' : 'var(--pos)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background:
                  budgetPace > 110
                    ? 'var(--neg)'
                    : budgetPace > 95
                      ? 'var(--accent)'
                      : 'var(--pos)',
              }}
            />
            {budgetPace}% of budget pace
          </span>
        )}
      </div>

      {/* ── 5 KPI stat cards ── */}
      <div
        className="kpi-grid-legacy"
        style={{
          gridTemplateColumns: 'repeat(5, 1fr)',
        }}
      >
        {(
          [
            {
              label: 'INCOME',
              color: ytdIncomeTotal > 0 ? 'var(--pos)' : 'var(--ink-3)',
              value: formatCurrency(ytdIncomeTotal),
              sub:
                ytdIncomeTotal > 0
                  ? `${formatCompact(incomeMonthlyAvg)}/mo avg`
                  : 'no income tracked',
            },
            {
              label: 'SPENT',
              color: 'var(--neg)',
              value: formatCurrency(ytdSpentTotal),
              sub: `${formatCompact(spentMonthlyAvg)}/mo avg`,
            },
            {
              label: 'SAVED',
              color: ytdSaved > 0 ? 'var(--pos)' : ytdSaved < 0 ? 'var(--neg)' : 'var(--ink-3)',
              value: `${ytdSaved > 0 ? '+' : ''}${formatCurrency(ytdSaved)}`,
              sub:
                savingsRate !== null
                  ? `${savingsRate}% rate`
                  : ytdSaved < 0
                    ? 'spending without income'
                    : null,
            },
            {
              label: 'PROJECTED FY SPEND',
              color: hasBudget && projectedFY > annualBudget ? 'var(--neg)' : 'var(--ink)',
              value: projectedFY > 0 ? formatCurrency(projectedFY) : '—',
              sub: hasBudget && projectedFY > 0 ? `vs budget ${formatCompact(annualBudget)}` : null,
            },
            {
              label: 'PROJECTED FY SAVINGS',
              color:
                projectedFYSavings > 0
                  ? 'var(--pos)'
                  : projectedFYSavings < 0
                    ? 'var(--neg)'
                    : 'var(--ink-3)',
              value:
                projectedFY > 0
                  ? `${projectedFYSavings >= 0 ? '+' : ''}${formatCurrency(projectedFYSavings)}`
                  : '—',
              sub:
                projectedFYSavingsRate !== null
                  ? `${projectedFYSavingsRate}% of income`
                  : projectedFY > 0
                    ? 'no income tracked'
                    : null,
            },
          ] as { label: string; color: string; value: string; sub: string | null }[]
        ).map(({ label, color, value, sub }, i, arr) => (
          <div
            key={label}
            style={{
              padding: '16px 20px',
              borderRight: i < arr.length - 1 ? '1px solid var(--line)' : undefined,
            }}
          >
            <p
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 8,
              }}
            >
              {label}
            </p>
            <p
              className="num"
              style={{
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color,
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              {value}
            </p>
            {sub && <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Cumulative line chart ── */}
      <div style={{ padding: '14px 20px 8px', borderBottom: '1px solid var(--line)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
            }}
          >
            Cumulative spend{hasBudget ? ' vs budget' : ''}
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {(
              [
                { label: 'actual', stroke: 'var(--accent)', dash: undefined },
                ...(hasBudget ? [{ label: 'expected', stroke: tickColor, dash: '5 5' }] : []),
                {
                  label: 'projected',
                  stroke: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  dash: '3 4',
                },
                ...(hasBudget
                  ? [{ label: 'annual budget', stroke: 'var(--neg)', dash: '5 3' }]
                  : []),
              ] as { label: string; stroke: string; dash?: string }[]
            ).map(({ label, stroke, dash }) => (
              <span
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10.5,
                  color: 'var(--ink-4)',
                }}
              >
                <svg width="20" height="10" style={{ flexShrink: 0 }}>
                  <line
                    x1="0"
                    y1="5"
                    x2="20"
                    y2="5"
                    stroke={stroke}
                    strokeWidth="1.5"
                    strokeDasharray={dash}
                  />
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={ytdLineData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
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
              domain={[0, 'dataMax + 5000']}
              width={50}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => (v ? formatCurrency(Number(v)) : '')}
            />
            {hasBudget && (
              <ReferenceLine
                y={annualBudget}
                stroke="var(--neg)"
                strokeDasharray="5 3"
                strokeOpacity={0.5}
                label={{
                  value: `Annual budget · ${formatCompact(annualBudget)}`,
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: 'var(--neg)',
                  offset: 6,
                }}
              />
            )}
            {hasBudget && (
              <Line
                type="monotone"
                dataKey="expected"
                stroke={tickColor}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="projected"
              stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
              strokeWidth={1.5}
              strokeDasharray="3 4"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: 'var(--surface)' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Monthly highlights ── */}
      {expenseMonths.length > 0 && (
        <YtdMonthlyHighlights
          highestMonth={highestMonth}
          lowestMonth={lowestMonth}
          bestSavingsMonth={bestSavingsMonth}
          avgExpense={avgExpense}
          monthName={monthName}
        />
      )}

      {/* ── Income sources + Category breakdown ── */}
      <YtdIncomeBreakdown
        ytdIncomeSources={ytdIncomeSources}
        ytdIncomeTotal={ytdIncomeTotal}
        expenseCategories={expenseCategories}
        maxExpense={maxExpense}
        annualBudget={annualBudget}
      />
    </section>
  )
}
