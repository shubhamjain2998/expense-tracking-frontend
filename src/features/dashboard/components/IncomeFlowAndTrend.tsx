import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
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

import { TOOLTIP_STYLE } from '../lib/chartTheme'
import type { IncomeExpenseTrendPoint } from '../types'

interface IncomeFlowAndTrendProps {
  totalIncome: number
  totalExpenses: number
  incomeTrendData: IncomeExpenseTrendPoint[]
  trendWindow: number
  onTrendWindowChange: (w: number) => void
  isLoading: boolean
  isDark: boolean
}

type TrendView = 'lines' | 'bars'

// Savings line uses a high-saturation blue, but lightness flips per-theme:
// dark mode needs a bright cyan to punch off the dark surface; light mode
// needs a richer, darker blue or it washes out against the cream background.
const SAVINGS_COLOR_DARK = 'oklch(0.82 0.17 220)'
const SAVINGS_COLOR_LIGHT = 'oklch(0.52 0.2 240)'

const SUBTITLES: Record<TrendView, string> = {
  lines: 'Income, expense, and savings',
  bars: 'Income vs expenses, with savings overlay',
}

const WINDOW_OPTIONS = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
] as const

function trendTitle(window: number): string {
  return `${window}-month trend`
}

export function IncomeFlowAndTrend({
  totalIncome,
  totalExpenses,
  incomeTrendData,
  trendWindow,
  onTrendWindowChange,
  isLoading,
  isDark,
}: IncomeFlowAndTrendProps) {
  const [view, setView] = useState<TrendView>('lines')
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set())

  const savingsColor = isDark ? SAVINGS_COLOR_DARK : SAVINGS_COLOR_LIGHT
  const lineKeys: { key: 'income' | 'expense' | 'savings'; label: string; color: string }[] = [
    { key: 'income', label: 'Income', color: 'var(--pos)' },
    { key: 'expense', label: 'Expense', color: 'var(--neg)' },
    { key: 'savings', label: 'Savings', color: savingsColor },
  ]

  function toggleLine(key: string) {
    setHiddenLines((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      // Prevent hiding the last visible series
      const allKeys = lineKeys.map((l) => l.key)
      if (allKeys.filter((k) => !next.has(k)).length <= 1) return prev
      next.add(key)
      return next
    })
  }

  const savings = totalIncome - totalExpenses
  const expensePct = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0
  const savingsPct = Math.max(100 - expensePct, 0)
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  const labelFor = (name: string) => {
    const line = lineKeys.find((l) => l.key === name)
    return line ? line.label : name
  }

  const savingsVisible = !hiddenLines.has('savings')
  const hasNegativeSavings = savingsVisible && incomeTrendData.some((p) => p.savings < 0)

  return (
    <section className="card">
      {/* WHERE YOUR INCOME GOES */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <p className="eyebrow">Where your income goes</p>
          {totalIncome > 0 && (
            <span className="num" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
              {formatCurrency(totalIncome)} income
            </span>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : totalIncome === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No income recorded this month.</p>
        ) : (
          <>
            <div
              style={{
                height: 10,
                display: 'flex',
                borderRadius: 5,
                overflow: 'hidden',
                background: 'var(--surface-3)',
              }}
            >
              <div
                style={{
                  width: `${expensePct}%`,
                  background: 'var(--neg)',
                  transition: 'width 0.4s ease',
                }}
              />
              {savingsPct > 0 && (
                <div style={{ flex: 1, background: 'var(--pos)', transition: 'flex 0.4s ease' }} />
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--neg)' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: 'var(--neg)',
                    display: 'inline-block',
                  }}
                />
                Expenses {Math.round(expensePct)}%
              </span>
              {savings > 0 ? (
                <span
                  style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--pos)' }}
                >
                  Saved {Math.round(savingsPct)}%
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: 'var(--pos)',
                      display: 'inline-block',
                    }}
                  />
                </span>
              ) : (
                <span style={{ color: 'var(--neg)' }}>
                  Deficit {formatCompact(Math.abs(savings))}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginBottom: 20 }} />

      {/* N-MONTH TREND */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            gap: 12,
          }}
        >
          <div>
            <p className="card-title">{trendTitle(trendWindow)}</p>
            <p className="card-sub">{SUBTITLES[view]}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div className="seg">
              {WINDOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={trendWindow === opt.value ? 'on' : ''}
                  onClick={() => onTrendWindowChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="seg">
              <button className={view === 'lines' ? 'on' : ''} onClick={() => setView('lines')}>
                Lines
              </button>
              <button className={view === 'bars' ? 'on' : ''} onClick={() => setView('bars')}>
                Bars
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : view === 'lines' ? (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={incomeTrendData} margin={{ top: 22, right: 16, left: 8, bottom: 0 }}>
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
              {hasNegativeSavings && (
                <ReferenceLine y={0} stroke={tickColor} strokeOpacity={0.4} strokeDasharray="2 4" />
              )}
              <Tooltip
                cursor={{ stroke: tickColor, strokeDasharray: '3 4', strokeOpacity: 0.5 }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [formatCurrency(Number(v)), labelFor(String(name))]}
              />
              {lineKeys.map(({ key, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={key === 'savings' ? 2.75 : 2.5}
                  strokeDasharray={key === 'savings' ? '6 4' : undefined}
                  dot={{
                    r: key === 'savings' ? 4 : 3.5,
                    strokeWidth: 2,
                    fill: 'var(--surface)',
                    stroke: color,
                  }}
                  activeDot={{ r: 5.5 }}
                  hide={hiddenLines.has(key)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart
              data={incomeTrendData}
              barGap={3}
              barCategoryGap="28%"
              margin={{ top: 22, right: 8, left: 8, bottom: 0 }}
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
              {hasNegativeSavings && (
                <ReferenceLine y={0} stroke={tickColor} strokeOpacity={0.4} strokeDasharray="2 4" />
              )}
              <Tooltip
                cursor={{ fill: gridStroke }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [formatCurrency(Number(v)), labelFor(String(name))]}
              />
              <Bar
                dataKey="income"
                name="income"
                fill="var(--pos)"
                radius={[3, 3, 0, 0]}
                hide={hiddenLines.has('income')}
              />
              <Bar
                dataKey="expense"
                name="expense"
                fill="var(--neg)"
                radius={[3, 3, 0, 0]}
                hide={hiddenLines.has('expense')}
              />
              <Line
                type="monotone"
                dataKey="savings"
                name="savings"
                stroke={savingsColor}
                strokeWidth={2.75}
                strokeDasharray="6 4"
                dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)', stroke: savingsColor }}
                activeDot={{ r: 5.5 }}
                hide={hiddenLines.has('savings')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', marginTop: 12 }}>
          {lineKeys.map(({ key, label, color }) => {
            const isHidden = hiddenLines.has(key)
            // Savings is always a dashed line; income/expense are lines in 'lines' view, bars in 'bars'.
            const renderAsLine = key === 'savings' || view === 'lines'
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleLine(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: tickColor,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  opacity: isHidden ? 0.35 : 1,
                  transition: 'opacity 0.15s ease',
                  userSelect: 'none',
                }}
              >
                <span
                  style={{
                    width: renderAsLine ? 14 : 10,
                    height: renderAsLine ? 2 : 10,
                    borderRadius: renderAsLine ? 1 : 2,
                    flexShrink: 0,
                    background:
                      key === 'savings'
                        ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 9px)`
                        : color,
                  }}
                />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
