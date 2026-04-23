import { useState, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
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

import {
  getDashboardSummary,
  getProcessedTransactions,
  getTags,
  getSplitLedger,
  getYTD,
  getPendingManual,
  getMonthlyTrend,
} from '../lib/api'
import { SkeletonTable, Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { YearMonthSelector } from '../components/ui/YearMonthSelector'
import { useThemeContext } from '../hooks/useThemeContext'

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

// Calendar-year month order and single-char labels for the YTD area chart x-axis
const FY_MONTH_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const FY_MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

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

interface Top3YtdRow {
  category: string
  actual_ytd: number | string
  pct: number
}

interface YtdDataPoint {
  month: string
  actual: number | null
  expected: number | null
  projected: number | null
}

// ─── Sub-component: DashboardHeader ──────────────────────────────────────────

interface DashboardHeaderProps {
  totalDebit: number
  totalBudget: number
  overPaceAmount: number
  dayOfMonth: number
  daysInMonth: number
  currentMonthLabel: string
  year: number
  month: number
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
  year,
  month,
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
            {`OVERVIEW · ${currentMonthLabel.toUpperCase()} ${year}`}
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
                    to="/review"
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
            year={year}
            month={month}
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
          {categoryStats.map((stat, i) => {
            // Bar width is relative to the category with the highest total spend
            const barPct =
              categoryStats[0].total > 0 ? (stat.total / categoryStats[0].total) * 100 : 0
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
                  style={{ flex: 1, height: 4, background: 'var(--surface-3)', borderRadius: 2 }}
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
                  }}
                >
                  avg {formatCompact(stat.avg)}
                </span>
              </div>
            )
          })}
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

// ─── Sub-component: YtdAreaChart ─────────────────────────────────────────────
// Three overlaid area series: actual (solid), expected pro-rata (dashed grey),
// and projected run-rate (dashed dark). A horizontal reference line marks the annual budget.

interface YtdAreaChartProps {
  ytdLineData: YtdDataPoint[]
  ytdSpentTotal: number
  expectedYtd: number
  projectedFY: number
  annualBudget: number
  year: number
  isDark: boolean
}

function YtdAreaChart({
  ytdLineData,
  ytdSpentTotal,
  expectedYtd,
  projectedFY,
  annualBudget,
  year,
  isDark,
}: YtdAreaChartProps) {
  const tickColor = isDark ? '#9A9A9A' : '#6A6A6B'
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  const kpis = [
    { label: 'SPENT YTD', value: formatCompact(ytdSpentTotal) },
    ...(expectedYtd > 0 ? [{ label: 'EXPECTED', value: formatCompact(expectedYtd) }] : []),
    {
      label: 'PROJECTED FY',
      value: projectedFY > 0 ? formatCompact(projectedFY) : '—',
      // Red if on track to exceed annual budget, green otherwise
      color:
        projectedFY > annualBudget && annualBudget > 0
          ? 'var(--neg)'
          : projectedFY > 0
            ? 'var(--pos)'
            : 'var(--ink)',
    },
    { label: 'ANNUAL BUDGET', value: annualBudget > 0 ? formatCompact(annualBudget) : '—' },
  ] as { label: string; value: string; color?: string }[]

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Year-to-date · {year}</p>
          <p className="card-sub">Cumulative monthly spend vs expected pace</p>
        </div>
        {/* KPI summary pills */}
        <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
          {kpis.map(({ label, value, color }) => (
            <div key={label}>
              <p
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-4)',
                  marginBottom: 2,
                }}
              >
                {label}
              </p>
              <p
                className="num"
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: color ?? 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={ytdLineData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="ytdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

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

          {/* Horizontal ceiling line at the annual budget */}
          {annualBudget > 0 && (
            <ReferenceLine
              y={annualBudget}
              stroke="var(--neg)"
              strokeDasharray="5 3"
              strokeOpacity={0.5}
            />
          )}

          {/* Pro-rata linear expected spend — runs continuously across the full year */}
          <Area
            type="monotone"
            dataKey="expected"
            stroke={isDark ? '#9AA4B2' : '#6A6A6B'}
            strokeWidth={1.8}
            strokeDasharray="5 5"
            fill="none"
            dot={false}
            connectNulls
          />

          {/* Run-rate projection into future months.
              connectNulls prevents a gap where past months have null projected values. */}
          <Area
            type="monotone"
            dataKey="projected"
            stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
            strokeWidth={1.8}
            strokeDasharray="3 4"
            fill="none"
            dot={false}
            connectNulls
          />

          {/* Actual cumulative spend — the primary series */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#ytdGrad)"
            dot={{ r: 3, strokeWidth: 2, stroke: 'var(--surface)' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  )
}

// ─── Sub-component: Top3YtdCategories ────────────────────────────────────────

interface Top3YtdCategoriesProps {
  top3Ytd: Top3YtdRow[]
  isLoading: boolean
}

function Top3YtdCategories({ top3Ytd, isLoading }: Top3YtdCategoriesProps) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Top 3 categories YTD</p>
          <p className="card-sub">Cumulative spend this year</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : top3Ytd.length === 0 ? (
        <EmptyState icon="leaderboard" title="No YTD data" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {top3Ytd.map((row, i) => (
            <div key={row.category}>
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
                      borderRadius: '50%',
                      background: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                    {row.category}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    className="num"
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                  >
                    {formatCompact(Number(row.actual_ytd))}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                    {Math.round(row.pct)}%
                  </span>
                </div>
              </div>
              <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${row.pct}%`,
                    background: PIE_COLORS[i % PIE_COLORS.length],
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
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
          <Link to="/review" className="btn sm" style={{ gap: 4 }}>
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

// ─── Main page: DashboardPage ─────────────────────────────────────────────────
// Owns all state, queries, and derived data. Passes computed slices down to
// focused sub-components — each sub-component only receives what it needs to render.

export function DashboardPage() {
  const now = new Date()
  const { isDark } = useThemeContext()

  // ── UI state ────────────────────────────────────────────────────────────────
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [includeSettled, setIncludeSettled] = useState(false)
  const [trendMode, setTrendMode] = useState<'stacked' | 'total'>('stacked')

  // ── Date helpers ────────────────────────────────────────────────────────────
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  // For past months treat the last day as "today" so pace = 100%
  const dayOfMonth = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate()
  const daysInMonth = new Date(year, month, 0).getDate()
  const paceAt = dayOfMonth / daysInMonth // fraction of month elapsed (0–1)
  const currentMonthLabel = MONTH_LABELS_FULL[month]

  // ── API queries ─────────────────────────────────────────────────────────────

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', year, month, selectedTagId],
    queryFn: () => getDashboardSummary(year, month, selectedTagId || undefined),
  })

  const ledgerQuery = useQuery({
    queryKey: ['splitLedger', year, month, includeSettled],
    queryFn: () => getSplitLedger(year, month, includeSettled),
  })

  const ytdQuery = useQuery({
    queryKey: ['ytd', year],
    queryFn: () => getYTD(year),
  })

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const allTxnQuery = useQuery({
    queryKey: ['allTransactions', year, month],
    queryFn: () => getProcessedTransactions(year, month),
  })

  // staleTime of 60s: pending items update infrequently and this widget appears on every load
  const pendingQuery = useQuery({
    queryKey: ['pendingManual'],
    queryFn: getPendingManual,
    staleTime: 60_000,
  })

  const yearlyTrendQuery = useQuery({
    queryKey: ['monthlyTrend', year],
    queryFn: () => getMonthlyTrend(year),
  })

  // The 6 calendar months ending at (and including) the selected month
  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - i, 1)
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('en-US', { month: 'short' }),
      }
    }).reverse()
  }, [year, month])

  // Parallel summary queries for each of the 6 months — reuses cache when months overlap across navigations
  const trendQueries = useQueries({
    queries: last6Months.map((m) => ({
      queryKey: ['dashboardSummary', m.year, m.month, selectedTagId],
      queryFn: () => getDashboardSummary(m.year, m.month, selectedTagId || undefined),
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

  // ── Derived: YTD aggregates ──────────────────────────────────────────────────

  // Memoized to give a stable reference — avoids spurious re-sorts in top3Ytd
  const ytdRows = useMemo(() => ytdQuery.data ?? [], [ytdQuery.data])
  const ytdSpentTotal = ytdRows.reduce((s, r) => s + Math.max(0, Number(r.actual_ytd)), 0)
  // Use the unfiltered YTD allocation as the annual budget (tag filter must not shrink it)
  const annualBudget = ytdRows.reduce((s, r) => s + Math.max(0, Number(r.allocated_ytd)), 0)

  const top3Ytd = useMemo<Top3YtdRow[]>(() => {
    return [...ytdRows]
      .filter((r) => Number(r.actual_ytd) > 0)
      .sort((a, b) => Number(b.actual_ytd) - Number(a.actual_ytd))
      .slice(0, 3)
      .map((r) => ({
        ...r,
        pct: ytdSpentTotal > 0 ? (Number(r.actual_ytd) / ytdSpentTotal) * 100 : 0,
      }))
  }, [ytdRows, ytdSpentTotal])

  // ── Derived: YTD area chart series ──────────────────────────────────────────

  const ytdLineData = useMemo<YtdDataPoint[]>(() => {
    const byMonth = new Map<number, number>()
    for (const dp of yearlyTrendQuery.data ?? []) {
      byMonth.set(dp.month, Number(dp.actual_amount))
    }
    // fyIndex: 1-based count of how many months have elapsed in the selected year
    const fyIndex = FY_MONTH_ORDER.findIndex((x) => x === month) + 1

    // Accumulate cumulative spend via reduce to avoid let-reassignment inside useMemo
    return FY_MONTH_ORDER.reduce<{ points: YtdDataPoint[]; cumulative: number }>(
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
            { month: FY_MONTH_LABELS[i], actual: hasData ? cumulative : null, expected, projected },
          ],
        }
      },
      { points: [], cumulative: 0 }
    ).points
  }, [yearlyTrendQuery.data, annualBudget, month])

  const hasYtdChart = ytdLineData.some((d) => d.actual !== null)

  // Accurate day-of-year: sum days in all completed months then add today
  const dayOfYear =
    Array.from({ length: month - 1 }, (_, i) => new Date(year, i + 1, 0).getDate()).reduce(
      (s, d) => s + d,
      0
    ) + dayOfMonth
  const daysInYear = new Date(year, 1, 29).getDate() === 29 ? 366 : 365
  const projectedFY =
    ytdSpentTotal > 0 && dayOfYear > 0 ? Math.round((ytdSpentTotal / dayOfYear) * daysInYear) : 0
  const expectedYtd = annualBudget > 0 ? Math.round((annualBudget * dayOfYear) / daysInYear) : 0

  // ── Derived: category donut data ─────────────────────────────────────────────

  const categoryChartData = summaryRows
    .filter((r) => Number(r.actual) > 0)
    .map((r) => ({ name: r.category, value: Number(r.actual) }))
    .sort((a, b) => b.value - a.value)

  // ── Derived: calendar layout ──────────────────────────────────────────────────

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
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
        year={year}
        month={month}
        onYearChange={setYear}
        onMonthChange={setMonth}
        selectedTagId={selectedTagId}
        onTagChange={setSelectedTagId}
        tags={tagsQuery.data ?? []}
        isLoading={summaryQuery.isLoading}
        pendingCount={pendingItems.length}
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
          year={year}
          isLoading={summaryQuery.isLoading}
        />
        <CategoryTransactionStats categoryStats={categoryStats} isLoading={allTxnQuery.isLoading} />
      </div>

      <SixMonthTrend
        stackedTrendData={stackedTrendData}
        stackCategories={stackCategories}
        trendMode={trendMode}
        onTrendModeChange={setTrendMode}
        isLoading={trendQueries.some((q) => q.isLoading)}
        isDark={isDark}
      />

      {hasYtdChart && (
        <YtdAreaChart
          ytdLineData={ytdLineData}
          ytdSpentTotal={ytdSpentTotal}
          expectedYtd={expectedYtd}
          projectedFY={projectedFY}
          annualBudget={annualBudget}
          year={year}
          isDark={isDark}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Top3YtdCategories top3Ytd={top3Ytd} isLoading={ytdQuery.isLoading} />
        <SplitLedger
          ledger={ledgerQuery.data ?? []}
          includeSettled={includeSettled}
          onToggleSettled={() => setIncludeSettled((v) => !v)}
          isLoading={ledgerQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailySpendCalendar
          dailySpend={dailySpend}
          year={year}
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
