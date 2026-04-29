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

import { TOOLTIP_STYLE } from '../lib/chartTheme'
import type { IncomeExpenseTrendPoint } from '../types'

interface IncomeFlowAndTrendProps {
  totalIncome: number
  totalExpenses: number
  incomeTrendData: IncomeExpenseTrendPoint[]
  isLoading: boolean
  isDark: boolean
}

export function IncomeFlowAndTrend({
  totalIncome,
  totalExpenses,
  incomeTrendData,
  isLoading,
  isDark,
}: IncomeFlowAndTrendProps) {
  const savings = totalIncome - totalExpenses
  const expensePct = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0
  const savingsPct = Math.max(100 - expensePct, 0)
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

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

      {/* 6-MONTH INCOME / EXPENSE TREND */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div>
            <p className="card-title">6-month trend</p>
            <p className="card-sub">Income vs expenses</p>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: tickColor, flexShrink: 0 }}>
            {(
              [
                { label: 'Income', color: 'var(--pos)' },
                { label: 'Expense', color: 'var(--neg)' },
                { label: 'Savings', color: tickColor },
              ] as { label: string; color: string }[]
            ).map(({ label, color }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 12,
                    height: 2,
                    borderRadius: 1,
                    background: color,
                    display: 'inline-block',
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
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
                formatter={(v: unknown, name: unknown) => {
                  const val = Number(v)
                  const key = String(name)
                  const label =
                    key === 'income' ? 'Income' : key === 'expense' ? 'Expense' : 'Savings'
                  return [formatCurrency(val), label]
                }}
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
      </div>
    </section>
  )
}
