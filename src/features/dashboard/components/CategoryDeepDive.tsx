import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'
import type { SummaryRow } from '@/types/dashboard'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { TOOLTIP_STYLE } from '../lib/chartTheme'

interface CategoryDeepDiveProps {
  allTransactions: ProcessedTransactionItem[]
  summaryRows: SummaryRow[]
  daysInMonth: number
  currentMonthLabel: string
  year: number
  isLoading: boolean
  isDark: boolean
}

export function CategoryDeepDive({
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
                Daily spend · {activeCategory.toUpperCase()}
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
