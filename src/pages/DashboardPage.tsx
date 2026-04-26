import { useQuery, useQueries } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonTable, Skeleton } from '../components/ui/Skeleton'
import { YearMonthSelector } from '../components/ui/YearMonthSelector'
import { usePeriodMode } from '../hooks/usePeriodMode'
import { useThemeContext } from '../hooks/useThemeContext'
import {
  getDashboardSummary,
  getProcessedTransactions,
  getTags,
  getSplitLedger,
  getYTD,
  getPendingManual,
  getMonthlyTrend,
} from '../lib/api'
import {
  formatYearLabel,
  getCurrentPeriod,
  loadPeriodMode,
  monthShortLabel,
  resolvePeriodMonth,
} from '../lib/period'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

// Compact format for tight spaces: ₹1.2L, ₹45k, ₹500
function formatCompact(n: number) {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Muted OKLCH palette — perceptually uniform so all slices appear equally weighted
const PIE_COLORS = [
  'oklch(0.62 0.10 250)',
  'oklch(0.65 0.10 155)',
  'oklch(0.68 0.10 75)',
  'oklch(0.63 0.10 25)',
  'oklch(0.62 0.10 310)',
  'oklch(0.65 0.10 200)',
  'oklch(0.60 0.10 350)',
  'oklch(0.65 0.08 100)',
  'oklch(0.58 0.10 270)',
  'oklch(0.70 0.09 130)',
  'oklch(0.66 0.11 50)',
  'oklch(0.60 0.12 320)',
]

const MONTH_LABELS_FULL = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// Shared tooltip style reused across all Recharts components
const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 6,
  boxShadow: 'var(--shadow-pop)',
  fontSize: 11.5,
  color: 'var(--ink)',
  padding: '6px 10px',
}

// ─── Local types ──────────────────────────────────────────────────────────────

interface SummaryRow {
  category: string
  actual: number | string
  allocated_monthly: number | string
}

interface LedgerRow {
  person_name: string
  total_split_amount: number | string
}

interface Tag {
  id: string
  name: string
}

interface PendingItem {
  id: string
  txn_date: string
  description: string
  amount: number | string
}

interface CategoryStat {
  category: string
  total: number
  count: number
  avg: number
}

interface YtdDataPoint {
  month: string
  actual: number | null
  expected: number | null
  projected: number | null
}

interface IncomeExpenseTrendPoint {
  month: string
  income: number
  expense: number
  savings: number
}

interface DeepDiveTxnItem {
  id: string
  txn_date: string
  description: string
  effective_amount: string
  category: string
}

// ─── Sub-component: IncomeSummaryCards ───────────────────────────────────────

interface IncomeSummaryCardsProps {
  totalIncome: number
  totalExpenses: number
  incomeByCategory: { category: string; total: number }[]
  isLoading: boolean
}

function IncomeSummaryCards({
  totalIncome,
  totalExpenses,
  incomeByCategory,
  isLoading,
}: IncomeSummaryCardsProps) {
  const savings = totalIncome - totalExpenses
  const savingsPositive = savings > 0
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0
  const expensePct = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0

  const eyebrow = (color: string, label: string) => (
    <p
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
        marginBottom: 10,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </p>
  )

  const dotColor = savingsPositive ? 'var(--pos)' : savings < 0 ? 'var(--neg)' : 'var(--ink-4)'

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {/* Income */}
        <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)' }}>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {eyebrow('var(--pos)', 'Income')}
              <p
                className="num"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {formatCurrency(totalIncome)}
              </p>
              {incomeByCategory.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
                  {incomeByCategory.slice(0, 3).map(({ category, total }) => (
                    <span
                      key={category}
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 1,
                          background: 'var(--ink-4)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      {category} {formatCompact(total)}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Expenses */}
        <div style={{ padding: '20px 24px', borderRight: '1px solid var(--line)' }}>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {eyebrow('var(--neg)', 'Expenses')}
              <p
                className="num"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {formatCurrency(totalExpenses)}
              </p>
              {totalIncome > 0 && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {expensePct}% of income spent
                </p>
              )}
            </>
          )}
        </div>

        {/* Savings — highlighted: green tint when positive, red tint when in deficit */}
        <div
          style={{
            padding: '20px 24px',
            background: savingsPositive
              ? 'color-mix(in oklab, var(--pos) 15%, transparent)'
              : savings < 0
                ? 'color-mix(in oklab, var(--neg) 10%, transparent)'
                : undefined,
          }}
        >
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              {eyebrow(dotColor, 'Savings')}
              <p
                className="num"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: dotColor,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {savings > 0 ? '+' : ''}
                {formatCurrency(savings)}
              </p>
              {totalIncome > 0 && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  Savings rate {Math.abs(Math.round(savingsRate))}%
                  {savings < 0 && (
                    <span style={{ color: 'var(--neg)', marginLeft: 4 }}>deficit</span>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Sub-component: IncomeFlowAndTrend ───────────────────────────────────────

interface IncomeFlowAndTrendProps {
  totalIncome: number
  totalExpenses: number
  incomeTrendData: IncomeExpenseTrendPoint[]
  isLoading: boolean
  isDark: boolean
}

function IncomeFlowAndTrend({
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

// ─── Sub-component: DashboardHeader ──────────────────────────────────────────

interface DashboardHeaderProps {
  totalDebit: number
  totalBudget: number
  overPaceAmount: number
  dayOfMonth: number
  daysInMonth: number
  currentMonthLabel: string
  displayYear: number // calendar year of the selected month (for "APR 2025" label)
  selectorYear: number // period year (drives the YearMonthSelector dropdown)
  selectorMonth: number // period month (1-12 in active mode)
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
  selectedTagId: string
  onTagChange: (id: string) => void
  tags: Tag[]
  isLoading: boolean
  pendingCount: number
}

function DashboardHeader({
  totalDebit,
  totalBudget,
  overPaceAmount,
  dayOfMonth,
  daysInMonth,
  currentMonthLabel,
  displayYear,
  selectorYear,
  selectorMonth,
  onYearChange,
  onMonthChange,
  selectedTagId,
  onTagChange,
  tags,
  isLoading,
  pendingCount,
}: DashboardHeaderProps) {
  return (
    <header>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: spend total + pace status line */}
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            {`OVERVIEW · ${currentMonthLabel.toUpperCase()} ${displayYear}`}
          </p>

          {isLoading ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1
                className="num"
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {formatCurrency(totalDebit)}
              </h1>
              {totalBudget > 0 && (
                <span
                  style={{
                    fontSize: 22,
                    color: 'var(--ink-3)',
                    fontWeight: 300,
                    letterSpacing: '-0.01em',
                  }}
                >
                  / {formatCurrency(totalBudget)}
                </span>
              )}
            </div>
          )}

          {!isLoading && (
            <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
              Day {dayOfMonth} of {daysInMonth}
              {overPaceAmount > 0 && totalBudget > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span style={{ color: 'var(--neg)', fontWeight: 500 }}>
                    {formatCompact(overPaceAmount)} over pace
                  </span>
                </>
              )}
              {overPaceAmount < 0 && totalBudget > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span style={{ color: 'var(--pos)', fontWeight: 500 }}>
                    {formatCompact(Math.abs(overPaceAmount))} under pace
                  </span>
                </>
              )}
              {pendingCount > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <Link
                    to="/transactions"
                    style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
                  >
                    {pendingCount} pending categorization
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        {/* Right: tag filter, month picker, upload shortcut */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {tags.length > 0 && (
            <select
              value={selectedTagId}
              onChange={(e) => onTagChange(e.target.value)}
              className="input"
              style={{ width: 'auto' }}
              aria-label="Filter by tag"
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <YearMonthSelector
            year={selectorYear}
            month={selectorMonth}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
          />
          <Link to="/upload" className="btn primary" style={{ gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              upload
            </span>
            Upload
          </Link>
        </div>
      </div>
    </header>
  )
}

// ─── Sub-component: BudgetPaceBars ───────────────────────────────────────────
// Renders one horizontal bar per category, sorted by % of allocation consumed.
// A vertical tick at `paceAt` shows where spend should be for today's date.

interface BudgetPaceBarsProps {
  budgetRows: SummaryRow[]
  paceAt: number // fraction of month elapsed (0–1)
  dayOfMonth: number
  isLoading: boolean
}

function BudgetPaceBars({ budgetRows, paceAt, dayOfMonth, isLoading }: BudgetPaceBarsProps) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Categories eating your budget</p>
          <p className="card-sub">
            Ranked by share of monthly allocation spent · pace marker shows expected burn for day{' '}
            {dayOfMonth}
          </p>
        </div>

        {/* Status legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 11,
            color: 'var(--ink-4)',
            flexShrink: 0,
          }}
        >
          {(['on track', 'hot', 'over'] as const).map((s) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  display: 'inline-block',
                  background:
                    s === 'over' ? 'var(--neg)' : s === 'hot' ? 'var(--warn)' : 'var(--pos)',
                }}
              />
              {s}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 1.5,
                height: 12,
                background: 'var(--ink)',
                opacity: 0.3,
                display: 'inline-block',
              }}
            />
            pace
          </span>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : budgetRows.length === 0 ? (
        <EmptyState
          icon="bar_chart"
          title="No data for this period"
          description="Upload a statement or set up your budget to get started."
        />
      ) : (
        <div>
          {budgetRows.map((row, idx) => {
            const allocated = Number(row.allocated_monthly)
            const actual = Math.max(0, Number(row.actual))
            const pctUsed = allocated > 0 ? actual / allocated : 0
            const expectedActual = allocated * paceAt
            const pctVsPace = expectedActual > 0 ? (actual / expectedActual - 1) * 100 : null

            // 10% buffer before flagging "hot" — minor overpace is noise, not a warning
            const status =
              actual > allocated ? 'over' : actual > expectedActual * 1.1 ? 'hot' : 'on-track'
            const fillColor =
              status === 'over' ? 'var(--neg)' : status === 'hot' ? 'var(--warn)' : 'var(--pos)'

            return (
              <div
                key={row.category}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '8px 0',
                  borderBottom: idx < budgetRows.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                {/* Label: color dot, category name, status chip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    width: 190,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: PIE_COLORS[idx % PIE_COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--ink)',
                      fontWeight: 500,
                      flex: 1,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.category}
                  </span>
                  {status !== 'on-track' && (
                    <span
                      className={`chip ${status === 'over' ? 'neg' : 'warn'}`}
                      style={{ height: 18, fontSize: 10, padding: '0 6px', flexShrink: 0 }}
                    >
                      {status}
                    </span>
                  )}
                </div>

                {/* Progress bar with pace marker tick */}
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    height: 5,
                    background: 'var(--surface-3)',
                    borderRadius: 2,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(pctUsed, 1) * 100}%`,
                      background: fillColor,
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }}
                  />
                  {/* Vertical tick at today's expected pace position */}
                  {allocated > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -3,
                        bottom: -3,
                        left: `${Math.min(paceAt, 1) * 100}%`,
                        width: 1.5,
                        background: 'var(--ink)',
                        opacity: 0.3,
                      }}
                    />
                  )}
                </div>

                {/* Amounts and pace delta */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexShrink: 0 }}>
                  <span
                    className="num"
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink)',
                      fontWeight: 500,
                      minWidth: 140,
                      textAlign: 'right',
                    }}
                  >
                    {formatCompact(actual)}
                    {allocated > 0 ? ` / ${formatCompact(allocated)}` : ''}
                  </span>
                  {pctVsPace !== null && (
                    <span
                      className="num"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: pctVsPace > 0 ? 'var(--neg)' : 'var(--pos)',
                        minWidth: 84,
                        textAlign: 'right',
                      }}
                    >
                      {pctVsPace > 0 ? '+' : ''}
                      {Math.round(pctVsPace)}% vs pace
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─── Sub-component: CategoryDonutChart ───────────────────────────────────────

interface CategoryDonutChartProps {
  data: { name: string; value: number }[]
  totalDebit: number
  currentMonthLabel: string
  year: number
  isLoading: boolean
}

function CategoryDonutChart({
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

// ─── Sub-component: CategoryTransactionStats ─────────────────────────────────
// Horizontal bar per category showing transaction count and average ticket size.

interface CategoryTransactionStatsProps {
  categoryStats: CategoryStat[]
  isLoading: boolean
}

function CategoryTransactionStats({ categoryStats, isLoading }: CategoryTransactionStatsProps) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Transactions by category</p>
          <p className="card-sub">Count and avg ticket, this month</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-52 w-full" />
      ) : categoryStats.length === 0 ? (
        <EmptyState icon="receipt" title="No transactions" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(() => {
            const maxTotal = Math.max(...categoryStats.map((s) => s.total), 1)
            return categoryStats.map((stat, i) => {
              const barPct = (stat.total / maxTotal) * 100
              return (
                <div key={stat.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      width: 100,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
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
                      {stat.category}
                    </span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: 'var(--surface-3)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${barPct}%`,
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <span
                    className="num"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--ink-3)',
                      minWidth: 24,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {stat.count}×
                  </span>
                  <span
                    className="num"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--ink-3)',
                      minWidth: 72,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    avg {formatCompact(stat.avg)}
                  </span>
                </div>
              )
            })
          })()}
        </div>
      )}
    </section>
  )
}

// ─── Sub-component: SixMonthTrend ────────────────────────────────────────────
// Stacked or total bar chart for the 6 months ending at the selected month.

interface SixMonthTrendProps {
  stackedTrendData: Record<string, number | string>[]
  stackCategories: string[]
  trendMode: 'stacked' | 'total'
  onTrendModeChange: (mode: 'stacked' | 'total') => void
  isLoading: boolean
  isDark: boolean
}

function SixMonthTrend({
  stackedTrendData,
  stackCategories,
  trendMode,
  onTrendModeChange,
  isLoading,
  isDark,
}: SixMonthTrendProps) {
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">6-month trend</p>
          <p className="card-sub">
            Monthly spend by category · each stack shows where the money went
          </p>
        </div>
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

      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={stackedTrendData}
            barSize={38}
            margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
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
              formatter={(v) => (v ? formatCurrency(Number(v)) : '')}
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
              <Bar
                dataKey="_total"
                fill={isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)'}
                radius={[3, 3, 0, 0]}
              >
                <LabelList
                  dataKey="_total"
                  position="top"
                  formatter={(v: unknown) => formatCompact(Number(v))}
                  style={{ fontSize: 10, fill: tickColor, fontWeight: 600 }}
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
  )
}

// ─── Sub-component: YtdSection ───────────────────────────────────────────────
// Unified YTD card: header metadata, 5 KPI stats, cumulative line chart,
// monthly highlights, income sources, and full category breakdown.

interface YtdSectionProps {
  ytdRows: Array<{
    category: string
    actual_ytd: number | string
    allocated_ytd: number | string
    pct_used: number | null
  }>
  yearlyTrendData: {
    month: number
    actual_amount: string
    income_amount?: string
    txn_count?: number
  }[]
  month: number
  yearLabel: string
  isDark: boolean
  ytdSpentTotal: number
  annualBudget: number
  projectedFY: number
  expectedYtd: number
  ytdLineData: YtdDataPoint[]
  isLoading: boolean
}

function YtdSection({
  ytdRows,
  yearlyTrendData,
  month,
  yearLabel,
  isDark,
  ytdSpentTotal,
  annualBudget,
  projectedFY,
  expectedYtd,
  ytdLineData,
  isLoading,
}: YtdSectionProps) {
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const hasBudget = annualBudget > 0

  // Income sources come from categories with negative actual_ytd
  const ytdIncomeSources = useMemo(
    () =>
      ytdRows
        .filter((r) => Number(r.actual_ytd) < 0)
        .map((r) => ({ category: r.category, total: Math.abs(Number(r.actual_ytd)) }))
        .sort((a, b) => b.total - a.total),
    [ytdRows]
  )
  const ytdIncomeTotal = ytdIncomeSources.reduce((s, r) => s + r.total, 0)
  const ytdSaved = ytdIncomeTotal - ytdSpentTotal
  const savingsRate = ytdIncomeTotal > 0 ? Math.round((ytdSaved / ytdIncomeTotal) * 100) : null

  const projectedFYIncome =
    month > 0 && ytdIncomeTotal > 0 ? Math.round((ytdIncomeTotal / month) * 12) : 0
  const projectedFYSavings = projectedFYIncome > 0 ? projectedFYIncome - projectedFY : 0
  const projectedFYSavingsRate =
    projectedFYIncome > 0 ? Math.round((projectedFYSavings / projectedFYIncome) * 100) : null

  // Per-month stats for highlights and MoM
  const monthlyStats = useMemo(
    () =>
      yearlyTrendData
        .filter((d) => Number(d.actual_amount) > 0 || Number(d.income_amount ?? 0) > 0)
        .map((d) => ({
          periodMonth: d.month,
          expense: Number(d.actual_amount),
          income: Number(d.income_amount ?? 0),
          savings: Number(d.income_amount ?? 0) - Number(d.actual_amount),
        }))
        .sort((a, b) => a.periodMonth - b.periodMonth),
    [yearlyTrendData]
  )

  const totalExpenseCount = yearlyTrendData.reduce((s, d) => s + (d.txn_count ?? 0), 0)

  const momPct = useMemo(() => {
    const em = monthlyStats.filter((m) => m.expense > 0)
    if (em.length < 2) return null
    const last = em[em.length - 1].expense
    const prev = em[em.length - 2].expense
    return prev > 0 ? Math.round(((last - prev) / prev) * 100) : null
  }, [monthlyStats])

  const expenseMonths = monthlyStats.filter((m) => m.expense > 0)
  const avgExpense =
    expenseMonths.length > 0
      ? expenseMonths.reduce((s, m) => s + m.expense, 0) / expenseMonths.length
      : 0
  const highestMonth =
    expenseMonths.length > 0
      ? expenseMonths.reduce((best, m) => (m.expense > best.expense ? m : best))
      : null
  const lowestMonth =
    expenseMonths.length > 0
      ? expenseMonths.reduce((best, m) => (m.expense < best.expense ? m : best))
      : null
  const incomeMonths = monthlyStats.filter((m) => m.income > 0)
  const bestSavingsMonth =
    incomeMonths.length > 0
      ? incomeMonths.reduce((best, m) => (m.savings > best.savings ? m : best))
      : null

  const budgetPace = expectedYtd > 0 ? Math.round((ytdSpentTotal / expectedYtd) * 100) : null

  const expenseCategories = ytdRows
    .filter((r) => Number(r.actual_ytd) > 0)
    .sort((a, b) => Number(b.actual_ytd) - Number(a.actual_ytd))
  const maxExpense = expenseCategories.length > 0 ? Number(expenseCategories[0].actual_ytd) : 1

  const incomeMonthlyAvg = month > 0 ? Math.round(ytdIncomeTotal / month) : 0
  const spentMonthlyAvg = month > 0 ? Math.round(ytdSpentTotal / month) : 0
  const monthName = (pm: number) => MONTH_LABELS_FULL[pm] ?? `M${pm}`

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
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {(
          [
            {
              label: 'INCOME',
              color: 'var(--pos)',
              value: ytdIncomeTotal > 0 ? formatCurrency(ytdIncomeTotal) : '—',
              sub: ytdIncomeTotal > 0 ? `${formatCompact(incomeMonthlyAvg)}/mo avg` : null,
            },
            {
              label: 'SPENT',
              color: 'var(--neg)',
              value: formatCurrency(ytdSpentTotal),
              sub: `${formatCompact(spentMonthlyAvg)}/mo avg`,
            },
            {
              label: 'SAVED',
              color: ytdSaved >= 0 ? 'var(--pos)' : 'var(--neg)',
              value:
                ytdIncomeTotal > 0 ? `${ytdSaved >= 0 ? '+' : ''}${formatCurrency(ytdSaved)}` : '—',
              sub: savingsRate !== null ? `${savingsRate}% rate` : null,
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
                    : 'var(--ink)',
              value:
                projectedFYIncome > 0
                  ? `${projectedFYSavings >= 0 ? '+' : ''}${formatCurrency(projectedFYSavings)}`
                  : '—',
              sub: projectedFYSavingsRate !== null ? `${projectedFYSavingsRate}% of income` : null,
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ padding: '12px 20px', borderRight: '1px solid var(--line)' }}>
            <p
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 6,
              }}
            >
              Highest spend month
            </p>
            {highestMonth && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 13, color: 'var(--neg)' }}
                  >
                    trending_up
                  </span>
                  <span
                    className="num"
                    style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}
                  >
                    {monthName(highestMonth.periodMonth)} · {formatCompact(highestMonth.expense)}
                  </span>
                </div>
                {avgExpense > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {Math.round((Math.abs(highestMonth.expense - avgExpense) / avgExpense) * 100)}%
                    above avg
                  </p>
                )}
              </>
            )}
          </div>

          <div style={{ padding: '12px 20px', borderRight: '1px solid var(--line)' }}>
            <p
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 6,
              }}
            >
              Lowest spend month
            </p>
            {lowestMonth && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 13, color: 'var(--pos)' }}
                  >
                    trending_down
                  </span>
                  <span
                    className="num"
                    style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}
                  >
                    {monthName(lowestMonth.periodMonth)} · {formatCompact(lowestMonth.expense)}
                  </span>
                </div>
                {avgExpense > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {Math.round((Math.abs(lowestMonth.expense - avgExpense) / avgExpense) * 100)}%
                    below avg
                  </p>
                )}
              </>
            )}
          </div>

          <div style={{ padding: '12px 20px' }}>
            <p
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 6,
              }}
            >
              Best savings month
            </p>
            {bestSavingsMonth ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 13, color: 'var(--pos)' }}
                  >
                    savings
                  </span>
                  <span
                    className="num"
                    style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pos)' }}
                  >
                    {monthName(bestSavingsMonth.periodMonth)} ·{' '}
                    {bestSavingsMonth.savings >= 0 ? '+' : ''}
                    {formatCompact(bestSavingsMonth.savings)}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                  {bestSavingsMonth.income > 0
                    ? Math.round((bestSavingsMonth.savings / bestSavingsMonth.income) * 100)
                    : 0}
                  % saved
                </p>
              </>
            ) : lowestMonth ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 13, color: 'var(--pos)' }}
                  >
                    savings
                  </span>
                  <span
                    className="num"
                    style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}
                  >
                    {monthName(lowestMonth.periodMonth)} · {formatCompact(lowestMonth.expense)}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>Lowest spend</p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Income sources + Category breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Income sources YTD */}
        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--line)' }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
              marginBottom: 14,
            }}
          >
            Income sources YTD
          </p>
          {ytdIncomeSources.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No income recorded this year.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ytdIncomeSources.map((src, i) => {
                const pct = ytdIncomeTotal > 0 ? Math.round((src.total / ytdIncomeTotal) * 100) : 0
                return (
                  <div key={src.category}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 5,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: PIE_COLORS[i % PIE_COLORS.length],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                          {src.category}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span
                          className="num"
                          style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                        >
                          {formatCurrency(src.total)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: PIE_COLORS[i % PIE_COLORS.length],
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Category breakdown YTD */}
        <div style={{ padding: '16px 20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
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
              Category breakdown YTD
            </p>
            {hasBudget && <p style={{ fontSize: 10, color: 'var(--ink-4)' }}>spent / ytd budget</p>}
          </div>
          {expenseCategories.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No expenses this year.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenseCategories.map((row, i) => {
                const actual = Number(row.actual_ytd)
                const allocated = Number(row.allocated_ytd)
                const pctUsed = allocated > 0 ? Math.round((actual / allocated) * 100) : null
                const barWidth =
                  allocated > 0
                    ? Math.min(100, Math.round((actual / allocated) * 100))
                    : Math.round((actual / maxExpense) * 100)
                const isOver = pctUsed !== null && pctUsed > 100
                const barColor = isOver ? 'var(--neg)' : PIE_COLORS[i % PIE_COLORS.length]
                return (
                  <div key={row.category}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: PIE_COLORS[i % PIE_COLORS.length],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{row.category}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="num" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                          {formatCompact(actual)}
                          {allocated > 0 ? ` / ${formatCompact(allocated)}` : ''}
                        </span>
                        {pctUsed !== null && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: isOver ? 'var(--neg)' : 'var(--ink-4)',
                              minWidth: 32,
                              textAlign: 'right',
                            }}
                          >
                            {pctUsed}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 2 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          background: barColor,
                          borderRadius: 2,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Sub-component: SplitLedger ──────────────────────────────────────────────

interface SplitLedgerProps {
  ledger: LedgerRow[]
  includeSettled: boolean
  onToggleSettled: () => void
  isLoading: boolean
}

function SplitLedger({ ledger, includeSettled, onToggleSettled, isLoading }: SplitLedgerProps) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Split ledger</p>
          <p className="card-sub">Owed to you</p>
        </div>
        <button
          onClick={onToggleSettled}
          className={includeSettled ? 'chip accent' : 'chip'}
          style={{ cursor: 'pointer' }}
          title={includeSettled ? 'Showing all (incl. settled)' : 'Hiding settled'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
            {includeSettled ? 'toggle_on' : 'toggle_off'}
          </span>
          Settled
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : ledger.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No split expenses this period.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ledger.map((row, i) => {
            const initials = row.person_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            return (
              <div
                key={row.person_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--surface-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--ink-2)',
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {row.person_name}
                    </p>
                    <p style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{i + 1} shared</p>
                  </div>
                </div>
                <span
                  className="num"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                >
                  {formatCurrency(Number(row.total_split_amount))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─── Sub-component: DailySpendCalendar ───────────────────────────────────────
// Heatmap calendar where cell background opacity encodes relative daily spend.

interface DailySpendCalendarProps {
  dailySpend: Map<number, number>
  year: number
  daysInMonth: number
  firstDayOfMonth: number // 0=Sun, used to left-pad the first row
  totalCells: number // rows × 7, pre-computed to avoid layout jitter
  currentMonthLabel: string
  isCurrentMonth: boolean
  isDark: boolean
}

function DailySpendCalendar({
  dailySpend,
  year,
  daysInMonth,
  firstDayOfMonth,
  totalCells,
  currentMonthLabel,
  isCurrentMonth,
  isDark,
}: DailySpendCalendarProps) {
  const today = new Date().getDate()
  // Avoid division by zero if the map is empty
  const maxDailySpend = Math.max(...Array.from(dailySpend.values()), 1)

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">
            Daily spend · {currentMonthLabel} {year}
          </p>
          <p className="card-sub">Hover to inspect. Intensity shows relative spend.</p>
        </div>
      </div>

      <div>
        {/* Day-of-week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 3,
            marginBottom: 4,
          }}
        >
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--ink-4)',
                padding: '2px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid — empty cells pad the first row to align with the right weekday */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstDayOfMonth + 1
            const isValid = day >= 1 && day <= daysInMonth
            const isToday = isCurrentMonth && day === today
            const spend = isValid ? (dailySpend.get(day) ?? 0) : 0
            // Alpha scales linearly from 0.15 (faint) to 0.85 (saturated) based on relative spend
            const intensity = spend > 0 ? Math.min(spend / maxDailySpend, 1) : 0
            const alpha = 0.15 + intensity * 0.7

            const bgColor = !isValid
              ? 'transparent'
              : spend > 0
                ? isDark
                  ? `oklch(0.72 0.14 255 / ${Math.round(alpha * 100)}%)`
                  : `oklch(0.55 0.14 255 / ${Math.round(alpha * 100)}%)`
                : 'var(--surface-2)'

            // Switch text to light when background is dark enough to ensure contrast
            const textColor = !isValid
              ? 'transparent'
              : intensity > 0.55
                ? 'var(--surface)'
                : 'var(--ink-2)'

            return (
              <div
                key={i}
                title={
                  isValid && spend > 0
                    ? `${day} ${currentMonthLabel}: ${formatCompact(spend)}`
                    : undefined
                }
                style={{
                  aspectRatio: '1',
                  borderRadius: 5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  padding: '3px 2px',
                  color: textColor,
                  background: bgColor,
                  outline: isToday ? '1.5px solid var(--ink)' : 'none',
                  outlineOffset: 1,
                }}
              >
                {isValid && (
                  <>
                    <span
                      style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, lineHeight: 1.2 }}
                    >
                      {day}
                    </span>
                    {spend > 0 && (
                      <span
                        className="num"
                        style={{
                          fontSize: 8.5,
                          lineHeight: 1.2,
                          opacity: intensity > 0.55 ? 0.9 : 0.7,
                        }}
                      >
                        {formatCompact(spend)}
                      </span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Sub-component: NeedsReview ──────────────────────────────────────────────
// Shows up to 6 uncategorized transactions with a link to the full review page.

interface NeedsReviewProps {
  pendingItems: PendingItem[]
  isLoading: boolean
}

function NeedsReview({ pendingItems, isLoading }: NeedsReviewProps) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Needs review</p>
          <p className="card-sub">{pendingItems.length} pending</p>
        </div>
        {pendingItems.length > 0 && (
          <Link to="/transactions" className="btn sm" style={{ gap: 4 }}>
            Review all
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              arrow_forward
            </span>
          </Link>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : pendingItems.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="All caught up"
          description="No transactions pending review."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pendingItems.slice(0, 6).map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom:
                  i < Math.min(pendingItems.length, 6) - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--mono)',
                    flexShrink: 0,
                  }}
                >
                  {item.txn_date.split('T')[0].slice(5)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--ink)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.description}
                </span>
              </div>
              <span
                className="num"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  flexShrink: 0,
                  paddingLeft: 12,
                }}
              >
                {formatCompact(Math.abs(Number(item.amount)))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Sub-component: CategoryDeepDive ─────────────────────────────────────────
// Self-contained: manages category selection, derives all stats from raw txn list.

interface CategoryDeepDiveProps {
  allTransactions: DeepDiveTxnItem[]
  summaryRows: SummaryRow[]
  daysInMonth: number
  currentMonthLabel: string
  year: number
  isLoading: boolean
  isDark: boolean
}

function CategoryDeepDive({
  allTransactions,
  summaryRows,
  daysInMonth,
  currentMonthLabel,
  year,
  isLoading,
  isDark,
}: CategoryDeepDiveProps) {
  // ── Category options (sorted: most over-budget first, then by spend) ─────────

  const categoryOptions = useMemo(() => {
    const spendMap = new Map<string, number>()
    for (const t of allTransactions) {
      const amt = Number(t.effective_amount)
      if (amt > 0) spendMap.set(t.category, (spendMap.get(t.category) ?? 0) + amt)
    }
    const budgetMap = new Map(summaryRows.map((r) => [r.category, Number(r.allocated_monthly)]))
    return Array.from(spendMap.keys()).sort((a, b) => {
      const allocA = budgetMap.get(a) ?? 0
      const allocB = budgetMap.get(b) ?? 0
      const pctA = allocA > 0 ? (spendMap.get(a) ?? 0) / allocA : 0
      const pctB = allocB > 0 ? (spendMap.get(b) ?? 0) / allocB : 0
      return pctB - pctA
    })
  }, [allTransactions, summaryRows])

  const [selectedCategory, setSelectedCategory] = useState('')

  // Use the user's pick when set, else default to the first option without storing it —
  // avoids a setState-in-effect cascade and keeps the source of truth in categoryOptions.
  const activeCategory =
    selectedCategory && categoryOptions.includes(selectedCategory)
      ? selectedCategory
      : (categoryOptions[0] ?? '')

  // ── Derived: filtered transactions for selected category ─────────────────────

  const filteredTxns = useMemo(
    () =>
      allTransactions.filter(
        (t) => t.category === activeCategory && Number(t.effective_amount) > 0
      ),
    [allTransactions, activeCategory]
  )

  const budgetRow = summaryRows.find((r) => r.category === activeCategory)
  const allocated = budgetRow ? Number(budgetRow.allocated_monthly) : 0
  const spent = filteredTxns.reduce((s, t) => s + Number(t.effective_amount), 0)
  const budgetPct = allocated > 0 ? Math.round((spent / allocated) * 100) : null
  const isOverBudget = allocated > 0 && spent > allocated

  const amounts = filteredTxns.map((t) => Number(t.effective_amount))
  const avgTicket = amounts.length > 0 ? spent / amounts.length : 0
  const highestTicket = amounts.length > 0 ? Math.max(...amounts) : 0

  // ── Derived: merchant breakdown ───────────────────────────────────────────────

  const merchantStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const t of filteredTxns) {
      const e = map.get(t.description) ?? { total: 0, count: 0 }
      e.total += Number(t.effective_amount)
      e.count += 1
      map.set(t.description, e)
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [filteredTxns])

  const uniqueMerchants = merchantStats.length
  const maxMerchantTotal = merchantStats[0]?.total ?? 1

  // ── Derived: top 5 transactions by amount ────────────────────────────────────

  const top5Txns = useMemo(
    () =>
      [...filteredTxns]
        .sort((a, b) => Number(b.effective_amount) - Number(a.effective_amount))
        .slice(0, 5),
    [filteredTxns]
  )

  // ── Derived: daily spend chart data ──────────────────────────────────────────

  const dailyChartData = useMemo(() => {
    const map = new Map<number, number>()
    for (const t of filteredTxns) {
      const day = parseInt(t.txn_date.split('T')[0].split('-')[2] ?? '1', 10)
      map.set(day, (map.get(day) ?? 0) + Number(t.effective_amount))
    }
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: map.get(i + 1) ?? 0,
    }))
  }, [filteredTxns, daysInMonth])

  const peakDay = dailyChartData.reduce((max, d) => (d.amount > max.amount ? d : max), {
    day: 0,
    amount: 0,
  })
  const activeDays = dailyChartData.filter((d) => d.amount > 0).length
  const dailyBudget = allocated > 0 ? Math.round(allocated / daysInMonth) : 0

  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  if (categoryOptions.length === 0 && !isLoading) return null

  return (
    <section className="card">
      {/* Card head */}
      <div className="card-head" style={{ marginBottom: 20 }}>
        <div>
          <p className="card-title">Category deep dive</p>
          <p className="card-sub">
            Top merchants and daily spend within a single category · {currentMonthLabel} {year}
          </p>
        </div>
        <select
          value={activeCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input"
          style={{ width: 'auto' }}
          aria-label="Select category"
        >
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filteredTxns.length === 0 ? (
        <EmptyState
          icon="search"
          title="No transactions"
          description="Pick a different category."
        />
      ) : (
        <>
          {/* KPI strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${allocated > 0 ? 4 : 3}, 1fr)`,
              borderTop: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
              marginBottom: 24,
            }}
          >
            {/* Spent */}
            <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line)' }}>
              <p
                className="eyebrow"
                style={{
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                Spent
              </p>
              <p
                className="num"
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {formatCurrency(spent)}
              </p>
              {allocated > 0 && (
                <p style={{ marginTop: 5, fontSize: 11.5, color: 'var(--ink-3)' }}>
                  of {formatCompact(allocated)} budget
                </p>
              )}
            </div>

            {/* Budget used — only shown when category has a budget */}
            {allocated > 0 && (
              <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line)' }}>
                <p className="eyebrow" style={{ marginBottom: 6 }}>
                  Budget used
                </p>
                <p
                  className="num"
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: isOverBudget ? 'var(--neg)' : 'var(--pos)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {budgetPct}%
                </p>
                <p
                  style={{
                    marginTop: 5,
                    fontSize: 11.5,
                    color: isOverBudget ? 'var(--neg)' : 'var(--ink-3)',
                  }}
                >
                  {isOverBudget ? 'over budget' : 'of budget'}
                </p>
              </div>
            )}

            {/* Transactions */}
            <div style={{ padding: '14px 18px', borderRight: '1px solid var(--line)' }}>
              <p className="eyebrow" style={{ marginBottom: 6 }}>
                Transactions
              </p>
              <p
                className="num"
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {filteredTxns.length}
              </p>
              <p style={{ marginTop: 5, fontSize: 11.5, color: 'var(--ink-3)' }}>
                {uniqueMerchants} unique merchant{uniqueMerchants !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Avg ticket */}
            <div style={{ padding: '14px 18px' }}>
              <p className="eyebrow" style={{ marginBottom: 6 }}>
                Avg ticket
              </p>
              <p
                className="num"
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {formatCurrency(avgTicket)}
              </p>
              <p style={{ marginTop: 5, fontSize: 11.5, color: 'var(--ink-3)' }}>
                highest {formatCompact(highestTicket)}
              </p>
            </div>
          </div>

          {/* Two-column body */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.7fr',
              gap: 32,
              alignItems: 'start',
            }}
          >
            {/* Left: top merchants + top transactions */}
            <div>
              <p className="eyebrow" style={{ marginBottom: 14 }}>
                Top merchants
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {merchantStats.slice(0, 5).map((m) => (
                  <div key={m.name}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--ink)',
                          fontWeight: 500,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          maxWidth: '75%',
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        className="num"
                        style={{ fontSize: 11.5, color: 'var(--ink-3)', flexShrink: 0 }}
                      >
                        {m.count}×
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: 'var(--surface-3)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(m.total / maxMerchantTotal) * 100}%`,
                          background: 'var(--accent)',
                          borderRadius: 2,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="eyebrow" style={{ marginBottom: 10 }}>
                Top 5 transactions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {top5Txns.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 0',
                      borderBottom: i < top5Txns.length - 1 ? '1px solid var(--line)' : 'none',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-4)',
                          fontFamily: 'var(--mono)',
                          flexShrink: 0,
                        }}
                      >
                        {t.txn_date.split('T')[0].slice(5).replace('-', '/')}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.description}
                      </span>
                    </div>
                    <span
                      className="num"
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--ink)',
                        flexShrink: 0,
                      }}
                    >
                      {formatCurrency(Number(t.effective_amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: daily spend chart */}
            <div>
              <p className="eyebrow" style={{ marginBottom: 14 }}>
                Daily spend · {selectedCategory.toUpperCase()}
              </p>

              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={dailyChartData}
                  barSize={7}
                  margin={{ top: 8, right: 56, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: tickColor }}
                    ticks={[1, 5, 10, 15, 20, 25, daysInMonth]}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: tickColor }}
                    tickFormatter={formatCompact}
                    width={42}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(day) => `Day ${day}`}
                    formatter={(v: unknown) => [formatCurrency(Number(v)), 'Spent']}
                  />
                  {dailyBudget > 0 && (
                    <ReferenceLine
                      y={dailyBudget}
                      stroke={tickColor}
                      strokeDasharray="5 3"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Bar dataKey="amount" fill="var(--accent)" radius={[2, 2, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>

              {activeDays > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 20,
                    marginTop: 10,
                    fontSize: 11.5,
                    color: 'var(--ink-3)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{activeDays}</span>{' '}
                    active days
                  </span>
                  {peakDay.day > 0 && (
                    <span>
                      Peak day ·{' '}
                      <span className="num" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                        {formatCompact(peakDay.amount)}
                      </span>{' '}
                      on {peakDay.day}
                    </span>
                  )}
                  {dailyBudget > 0 && (
                    <span>
                      Daily budget ·{' '}
                      <span className="num" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                        {formatCurrency(dailyBudget)}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// ─── Main page: DashboardPage ─────────────────────────────────────────────────
// Owns all state, queries, and derived data. Passes computed slices down to
// focused sub-components — each sub-component only receives what it needs to render.

export function DashboardPage() {
  const now = new Date()
  const { isDark } = useThemeContext()
  const { mode } = usePeriodMode()

  // ── UI state ────────────────────────────────────────────────────────────────
  const initial = getCurrentPeriod(loadPeriodMode(), now)
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [includeSettled, setIncludeSettled] = useState(false)
  const [trendMode, setTrendMode] = useState<'stacked' | 'total'>('stacked')

  // ── Date helpers ────────────────────────────────────────────────────────────
  // (year, month) are in *period* terms — translate to calendar values for any
  // JS Date math, since Date is calendar-only.
  const { year: calYear, month: calMonth } = resolvePeriodMonth(year, month, mode)
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth() + 1
  // For past months treat the last day as "today" so pace = 100%
  const dayOfMonth = isCurrentMonth ? now.getDate() : new Date(calYear, calMonth, 0).getDate()
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const paceAt = dayOfMonth / daysInMonth // fraction of month elapsed (0–1)
  const currentMonthLabel = MONTH_LABELS_FULL[calMonth]

  // ── API queries ─────────────────────────────────────────────────────────────

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', year, month, selectedTagId, mode],
    queryFn: () => getDashboardSummary(year, month, selectedTagId || undefined, mode),
  })

  const ledgerQuery = useQuery({
    queryKey: ['splitLedger', year, month, includeSettled, mode],
    queryFn: () => getSplitLedger(year, month, includeSettled, mode),
  })

  const ytdQuery = useQuery({
    queryKey: ['ytd', year, mode],
    queryFn: () => getYTD(year, mode),
  })

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const allTxnQuery = useQuery({
    queryKey: ['allTransactions', year, month, mode],
    queryFn: () => getProcessedTransactions(year, month, undefined, undefined, mode),
  })

  // staleTime of 60s: pending items update infrequently and this widget appears on every load
  const pendingQuery = useQuery({
    queryKey: ['pendingManual'],
    queryFn: getPendingManual,
    staleTime: 60_000,
  })

  const yearlyTrendQuery = useQuery({
    queryKey: ['monthlyTrend', year, mode],
    queryFn: () => getMonthlyTrend(year, undefined, undefined, mode),
  })

  // The 6 calendar months ending at (and including) the selected month
  // (anchor on calendar values so the trailing window is correct in both modes)
  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(calYear, calMonth - 1 - i, 1)
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('en-US', { month: 'short' }),
      }
    }).reverse()
  }, [calYear, calMonth])

  // Per-month queries pass period_mode='calendar' because m.year/m.month are
  // calendar values, not period values.
  const trendQueries = useQueries({
    queries: last6Months.map((m) => ({
      queryKey: ['dashboardSummary', m.year, m.month, selectedTagId, 'calendar'],
      queryFn: () => getDashboardSummary(m.year, m.month, selectedTagId || undefined, 'calendar'),
    })),
  })

  const incomeQueries = useQueries({
    queries: last6Months.map((m) => ({
      queryKey: ['allTransactions', m.year, m.month, 'calendar'],
      queryFn: () => getProcessedTransactions(m.year, m.month, undefined, undefined, 'calendar'),
    })),
  })

  // ── Derived: monthly summary ─────────────────────────────────────────────────

  // Memoized to give a stable reference — avoids spurious re-sorts in budgetRows
  const summaryRows = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data])
  const totalDebit = summaryRows
    .filter((r) => Number(r.actual) > 0)
    .reduce((s, r) => s + Number(r.actual), 0)
  const totalBudget = summaryRows.reduce((s, r) => s + Number(r.allocated_monthly), 0)
  const overPaceAmount = totalDebit - totalBudget * paceAt

  // Sorted descending by % of budget consumed so worst offenders appear first
  const budgetRows = useMemo(() => {
    return [...summaryRows]
      .filter((r) => Number(r.actual) > 0 || Number(r.allocated_monthly) > 0)
      .sort((a, b) => {
        const pctA =
          Number(a.allocated_monthly) > 0 ? Number(a.actual) / Number(a.allocated_monthly) : 0
        const pctB =
          Number(b.allocated_monthly) > 0 ? Number(b.actual) / Number(b.allocated_monthly) : 0
        return pctB - pctA
      })
  }, [summaryRows])

  // ── Derived: per-category transaction stats ──────────────────────────────────

  const categoryStats = useMemo<CategoryStat[]>(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const txn of allTxnQuery.data ?? []) {
      const amt = Number(txn.effective_amount)
      if (amt > 0) {
        const e = map.get(txn.category) ?? { total: 0, count: 0 }
        e.total += amt
        e.count += 1
        map.set(txn.category, e)
      }
    }
    return Array.from(map.entries())
      .map(([cat, v]) => ({ category: cat, ...v, avg: v.count > 0 ? v.total / v.count : 0 }))
      .sort((a, b) => b.count - a.count)
  }, [allTxnQuery.data])

  // ── Derived: daily spend map (day-of-month → total) ──────────────────────────

  const dailySpend = useMemo(() => {
    const map = new Map<number, number>()
    for (const txn of allTxnQuery.data ?? []) {
      const amt = Number(txn.effective_amount)
      if (amt > 0) {
        const day = parseInt(txn.txn_date.split('T')[0].split('-')[2] ?? '1', 10)
        map.set(day, (map.get(day) ?? 0) + amt)
      }
    }
    return map
  }, [allTxnQuery.data])

  // ── Derived: 6-month stacked trend ──────────────────────────────────────────

  const { stackedTrendData, stackCategories } = useMemo(() => {
    const catSet = new Set<string>()
    const data = trendQueries.map((q, i) => {
      const rows = q.data ?? []
      const obj: Record<string, number | string> = { month: last6Months[i].label }
      let total = 0
      for (const row of rows) {
        const amt = Math.max(0, Number(row.actual))
        if (amt > 0) {
          obj[row.category] = amt
          catSet.add(row.category)
          total += amt
        }
      }
      obj._total = total
      return obj
    })
    return { stackedTrendData: data, stackCategories: Array.from(catSet) }
  }, [trendQueries, last6Months])

  // ── Derived: income summary ──────────────────────────────────────────────────

  const totalIncome = useMemo(() => {
    return (allTxnQuery.data ?? [])
      .filter((t) => Number(t.effective_amount) < 0)
      .reduce((s, t) => s - Number(t.effective_amount), 0)
  }, [allTxnQuery.data])

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTxnQuery.data ?? []) {
      const amt = Number(t.effective_amount)
      if (amt < 0) {
        map.set(t.category, (map.get(t.category) ?? 0) - amt)
      }
    }
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [allTxnQuery.data])

  const incomeTrendData = useMemo<IncomeExpenseTrendPoint[]>(() => {
    return last6Months.map((m, i) => {
      const txns = incomeQueries[i].data ?? []
      const income = txns
        .filter((t) => Number(t.effective_amount) < 0)
        .reduce((s, t) => s - Number(t.effective_amount), 0)
      const expense = txns
        .filter((t) => Number(t.effective_amount) > 0)
        .reduce((s, t) => s + Number(t.effective_amount), 0)
      return { month: m.label, income, expense, savings: income - expense }
    })
  }, [incomeQueries, last6Months])

  // ── Derived: YTD aggregates ──────────────────────────────────────────────────

  const ytdRows = useMemo(() => ytdQuery.data ?? [], [ytdQuery.data])
  const ytdSpentTotal = ytdRows.reduce((s, r) => s + Math.max(0, Number(r.actual_ytd)), 0)
  // Use the unfiltered YTD allocation as the annual budget (tag filter must not shrink it)
  const annualBudget = ytdRows.reduce((s, r) => s + Math.max(0, Number(r.allocated_ytd)), 0)

  // ── Derived: YTD area chart series ──────────────────────────────────────────

  const ytdLineData = useMemo<YtdDataPoint[]>(() => {
    // Backend returns trend rows with `month` already as the period month index
    // (1-12), so iterating 1..12 walks the period in display order.
    const byMonth = new Map<number, number>()
    for (const dp of yearlyTrendQuery.data ?? []) {
      byMonth.set(dp.month, Number(dp.actual_amount))
    }
    // 1-based count of how many months have elapsed in the selected period
    const fyIndex = month

    return Array.from({ length: 12 }, (_, i) => i + 1).reduce<{
      points: YtdDataPoint[]
      cumulative: number
    }>(
      (acc, m, i) => {
        const amt = byMonth.get(m)
        const hasData = amt !== undefined
        const cumulative = hasData ? acc.cumulative + (amt as number) : acc.cumulative
        const expected = annualBudget > 0 ? Math.round(((i + 1) / 12) * annualBudget) : null
        const projected =
          i >= fyIndex - 1 && cumulative > 0
            ? Math.round(
                cumulative + Math.max(0, i - fyIndex + 1) * (cumulative / Math.max(1, fyIndex))
              )
            : null
        return {
          cumulative,
          points: [
            ...acc.points,
            {
              month: monthShortLabel(m, mode).charAt(0),
              actual: hasData ? cumulative : null,
              expected,
              projected,
            },
          ],
        }
      },
      { points: [], cumulative: 0 }
    ).points
  }, [yearlyTrendQuery.data, annualBudget, month, mode])

  // Days elapsed within the *period* up to today (or end-of-month for past months).
  // Iterate completed period_months, resolving each to its calendar (cy, cm) so
  // Date math gives the right day count in either mode.
  const dayOfYear =
    Array.from({ length: month - 1 }, (_, i) => {
      const { year: cy, month: cm } = resolvePeriodMonth(year, i + 1, mode)
      return new Date(cy, cm, 0).getDate()
    }).reduce((s, d) => s + d, 0) + dayOfMonth

  // Total days in the selected period (handles FY 25-26 spanning two calendar years).
  const daysInYear = Array.from({ length: 12 }, (_, i) => {
    const { year: cy, month: cm } = resolvePeriodMonth(year, i + 1, mode)
    return new Date(cy, cm, 0).getDate()
  }).reduce((s, d) => s + d, 0)
  const projectedFY =
    ytdSpentTotal > 0 && dayOfYear > 0 ? Math.round((ytdSpentTotal / dayOfYear) * daysInYear) : 0
  const expectedYtd = annualBudget > 0 ? Math.round((annualBudget * dayOfYear) / daysInYear) : 0

  // ── Derived: category donut data ─────────────────────────────────────────────

  const categoryChartData = summaryRows
    .filter((r) => Number(r.actual) > 0)
    .map((r) => ({ name: r.category, value: Number(r.actual) }))
    .sort((a, b) => b.value - a.value)

  // ── Derived: calendar layout ──────────────────────────────────────────────────

  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay()
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  const pendingItems = pendingQuery.data ?? []

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <DashboardHeader
        totalDebit={totalDebit}
        totalBudget={totalBudget}
        overPaceAmount={overPaceAmount}
        dayOfMonth={dayOfMonth}
        daysInMonth={daysInMonth}
        currentMonthLabel={currentMonthLabel}
        displayYear={calYear}
        selectorYear={year}
        selectorMonth={month}
        onYearChange={setYear}
        onMonthChange={setMonth}
        selectedTagId={selectedTagId}
        onTagChange={setSelectedTagId}
        tags={tagsQuery.data ?? []}
        isLoading={summaryQuery.isLoading}
        pendingCount={pendingItems.length}
      />

      <IncomeSummaryCards
        totalIncome={totalIncome}
        totalExpenses={totalDebit}
        incomeByCategory={incomeByCategory}
        isLoading={allTxnQuery.isLoading}
      />

      <IncomeFlowAndTrend
        totalIncome={totalIncome}
        totalExpenses={totalDebit}
        incomeTrendData={incomeTrendData}
        isLoading={allTxnQuery.isLoading || incomeQueries.some((q) => q.isLoading)}
        isDark={isDark}
      />

      <BudgetPaceBars
        budgetRows={budgetRows}
        paceAt={paceAt}
        dayOfMonth={dayOfMonth}
        isLoading={summaryQuery.isLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryDonutChart
          data={categoryChartData}
          totalDebit={totalDebit}
          currentMonthLabel={currentMonthLabel}
          year={calYear}
          isLoading={summaryQuery.isLoading}
        />
        <CategoryTransactionStats categoryStats={categoryStats} isLoading={allTxnQuery.isLoading} />
      </div>

      <CategoryDeepDive
        allTransactions={allTxnQuery.data ?? []}
        summaryRows={summaryRows}
        daysInMonth={daysInMonth}
        currentMonthLabel={currentMonthLabel}
        year={calYear}
        isLoading={allTxnQuery.isLoading}
        isDark={isDark}
      />

      <SixMonthTrend
        stackedTrendData={stackedTrendData}
        stackCategories={stackCategories}
        trendMode={trendMode}
        onTrendModeChange={setTrendMode}
        isLoading={trendQueries.some((q) => q.isLoading)}
        isDark={isDark}
      />

      <YtdSection
        ytdRows={ytdRows}
        yearlyTrendData={yearlyTrendQuery.data ?? []}
        month={month}
        yearLabel={formatYearLabel(year, mode)}
        isDark={isDark}
        ytdSpentTotal={ytdSpentTotal}
        annualBudget={annualBudget}
        projectedFY={projectedFY}
        expectedYtd={expectedYtd}
        ytdLineData={ytdLineData}
        isLoading={ytdQuery.isLoading || yearlyTrendQuery.isLoading}
      />

      <SplitLedger
        ledger={ledgerQuery.data ?? []}
        includeSettled={includeSettled}
        onToggleSettled={() => setIncludeSettled((v) => !v)}
        isLoading={ledgerQuery.isLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailySpendCalendar
          dailySpend={dailySpend}
          year={calYear}
          daysInMonth={daysInMonth}
          firstDayOfMonth={firstDayOfMonth}
          totalCells={totalCells}
          currentMonthLabel={currentMonthLabel}
          isCurrentMonth={isCurrentMonth}
          isDark={isDark}
        />
        <NeedsReview pendingItems={pendingItems} isLoading={pendingQuery.isLoading} />
      </div>
    </div>
  )
}
