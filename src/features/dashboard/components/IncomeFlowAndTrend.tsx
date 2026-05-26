import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  isLoading: boolean
  isDark: boolean
}

type TrendView = 'lines' | 'bars'

const LINE_KEYS: { key: 'income' | 'expense' | 'savings'; label: string; color: string }[] = [
  { key: 'income', label: 'Income', color: 'var(--pos)' },
  { key: 'expense', label: 'Expense', color: 'var(--neg)' },
  { key: 'savings', label: 'Savings', color: 'var(--accent)' },
]

const SUBTITLES: Record<TrendView, string> = {
  lines: 'Income, expense, and savings',
  bars: 'Income vs expenses',
}

export function IncomeFlowAndTrend({
  totalIncome,
  totalExpenses,
  incomeTrendData,
  isLoading,
  isDark,
}: IncomeFlowAndTrendProps) {
  const [view, setView] = useState<TrendView>('lines')
  const savings = totalIncome - totalExpenses
  const expensePct = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0
  const savingsPct = Math.max(100 - expensePct, 0)
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  const labelFor = (name: string) => {
    const line = LINE_KEYS.find((l) => l.key === name)
    return line ? line.label : name
  }

  const hasNegativeSavings = view === 'lines' && incomeTrendData.some((p) => p.savings < 0)

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

      {/* 6-MONTH TREND */}
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
            <p className="card-title">6-month trend</p>
            <p className="card-sub">{SUBTITLES[view]}</p>
          </div>
          <div className="seg" style={{ flexShrink: 0 }}>
            <button className={view === 'lines' ? 'on' : ''} onClick={() => setView('lines')}>
              Lines
            </button>
            <button className={view === 'bars' ? 'on' : ''} onClick={() => setView('bars')}>
              Bars
            </button>
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
              {LINE_KEYS.map(({ key, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={key === 'savings' ? 2 : 2.5}
                  strokeDasharray={key === 'savings' ? '5 4' : undefined}
                  dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--surface)', stroke: color }}
                  activeDot={{ r: 5.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
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
              <Tooltip
                cursor={false}
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [formatCurrency(Number(v)), labelFor(String(name))]}
              />
              <Bar dataKey="income" name="income" fill="var(--pos)" radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="savings"
                  position="top"
                  formatter={(v: unknown) => {
                    const n = Number(v)
                    if (Math.abs(n) < 100) return ''
                    return `${n >= 0 ? '+' : ''}${formatCompact(n)}`
                  }}
                  style={{ fontSize: 9.5, fill: tickColor, fontWeight: 600 }}
                />
              </Bar>
              <Bar dataKey="expense" name="expense" fill="var(--neg)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', marginTop: 12 }}>
          {LINE_KEYS.map(({ key, label, color }) => {
            // In bars mode, savings appears as a label above each pair, not as a series.
            if (view === 'bars' && key === 'savings') {
              return (
                <span
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: tickColor,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tickColor }}>
                    +₹
                  </span>
                  Savings (per bar)
                </span>
              )
            }
            return (
              <span
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: tickColor,
                }}
              >
                <span
                  style={{
                    width: view === 'lines' ? 14 : 10,
                    height: view === 'lines' ? 2 : 10,
                    borderRadius: view === 'lines' ? 1 : 2,
                    flexShrink: 0,
                    background:
                      view === 'lines' && key === 'savings'
                        ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 9px)`
                        : color,
                  }}
                />
                {label}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}
