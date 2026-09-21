import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { YearMonthSelector } from '@/components/ui/YearMonthSelector'
import { useAllProcessedTransactions } from '@/features/dashboard/hooks/useAllProcessedTransactions'
import { MONTH_LABELS_FULL } from '@/features/dashboard/lib/chartTheme'
import { usePeriod } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { getBudget, getMonthlyBudgetOverrides } from '@/lib/api/budget'
import { formatCurrency } from '@/lib/format'
import { calendarToPeriod, resolvePeriodMonth } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

import { CategoryBreakdown } from './components/CategoryBreakdown'
import { CategoryTransactionsTable } from './components/CategoryTransactionsTable'
import { CategoryTrendChart } from './components/CategoryTrendChart'
import {
  categoryMonthlySeries,
  computeCategoryStats,
  dominantTransaction,
  merchantBreakdown,
  tagBreakdown,
} from './lib/categoryStats'

const TREND_MONTHS = 15

/**
 * Category (/c/:categoryId) — one category's trend, stats and transactions.
 * Reached from Home's "Where it went" rows, not a nav destination — see
 * design-system/kosh-ledger/MASTER.md §7. `:categoryId` is the category's
 * NAME, URL-encoded (`WhereItWent` links with
 * `/c/${encodeURIComponent(row.category)}`) — there's no separate id in
 * this app's category model at the row-link level.
 *
 * Shaping salvaged from `CategoryDeepDive.tsx` (merchants, daily/monthly
 * aggregation) and `CategoryTransactionStats.tsx` (count + avg-ticket
 * framing) ahead of Phase 7 deleting both — see `lib/categoryStats.ts`.
 */
export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const category = categoryId ? decodeURIComponent(categoryId) : ''

  const now = useMemo(() => new Date(), [])
  const { isDark } = useThemeContext()
  const { mode } = usePeriodMode()
  const { transactions: allHistory, isLoading: historyLoading } = useAllProcessedTransactions()

  // ── Period picker — the app-wide sticky period (usePeriod) ──────────────
  const { year, month, setPeriod } = usePeriod()

  const { year: calYear, month: calMonth } = resolvePeriodMonth(year, month, mode)
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth() + 1
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const daysLeftInMonth = isCurrentMonth ? Math.max(0, daysInMonth - now.getDate()) : 0
  const monthLabel = `${MONTH_LABELS_FULL[calMonth]} ${calYear}`
  const prevCal =
    calMonth === 1 ? { year: calYear - 1, month: 12 } : { year: calYear, month: calMonth - 1 }

  // ── Category-scoped budget (this category, this calendar month only) ───
  const budgetQuery = useQuery({
    queryKey: qk.budget.byYear(calYear),
    queryFn: () => getBudget(calYear),
  })
  const overridesQuery = useQuery({
    queryKey: qk.budget.overrides(calYear),
    queryFn: () => getMonthlyBudgetOverrides(calYear),
  })
  const budgetEntry = budgetQuery.data?.find((e) => e.category === category)
  const override = overridesQuery.data?.find((o) => o.category === category && o.month === calMonth)
  const monthlyBudget = override
    ? Number(override.allocated_amount)
    : budgetEntry
      ? Number(budgetEntry.allocated_amount) / 12
      : 0

  // ── Derived transaction sets ─────────────────────────────────────────────
  const categoryExists = useMemo(
    () => allHistory.some((t) => t.category === category),
    [allHistory, category]
  )

  const monthTxns = useMemo(
    () =>
      allHistory.filter((t) => {
        if (t.category !== category || t.txn_type !== 'expense') return false
        const d = new Date(t.txn_date)
        return d.getFullYear() === calYear && d.getMonth() + 1 === calMonth
      }),
    [allHistory, category, calYear, calMonth]
  )
  const allTxnsThisMonth = useMemo(
    () =>
      allHistory.filter((t) => {
        if (t.txn_type !== 'expense') return false
        const d = new Date(t.txn_date)
        return d.getFullYear() === calYear && d.getMonth() + 1 === calMonth
      }),
    [allHistory, calYear, calMonth]
  )
  const allTxnsPrevMonth = useMemo(
    () =>
      allHistory.filter((t) => {
        if (t.txn_type !== 'expense') return false
        const d = new Date(t.txn_date)
        return d.getFullYear() === prevCal.year && d.getMonth() + 1 === prevCal.month
      }),
    [allHistory, prevCal.year, prevCal.month]
  )

  const series = useMemo(
    () => categoryMonthlySeries(allHistory, category, calYear, calMonth, TREND_MONTHS),
    [allHistory, category, calYear, calMonth]
  )
  const stats = useMemo(
    () => computeCategoryStats(series, monthTxns, allTxnsThisMonth, allTxnsPrevMonth),
    [series, monthTxns, allTxnsThisMonth, allTxnsPrevMonth]
  )
  const merchants = useMemo(() => merchantBreakdown(monthTxns), [monthTxns])
  const tags = useMemo(() => tagBreakdown(monthTxns), [monthTxns])
  const dominant = useMemo(() => dominantTransaction(monthTxns), [monthTxns])

  const isLoading = historyLoading || budgetQuery.isLoading || overridesQuery.isLoading

  // "Open in Transactions" — pre-filters to this category via the
  // `?category=<id>` param Transactions now reads on mount. `category_id`
  // comes off any matching transaction since this page only has the
  // category's NAME (see the class comment above), not a separate id.
  const txnPeriod = calendarToPeriod(calYear, calMonth, mode)
  const matchedCategoryId = allHistory.find((t) => t.category === category)?.category_id
  const openInTransactionsHref = `/transactions?year=${txnPeriod.year}&month=${txnPeriod.month}${
    matchedCategoryId ? `&category=${matchedCategoryId}` : ''
  }`

  if (!historyLoading && !categoryExists) {
    return (
      <div className="space-y-6">
        <p className="text-[12.5px] text-[var(--ink-3)]">
          <Link to="/dashboard">Home</Link> ·{' '}
          <span className="text-[var(--ink-4)]">{category}</span>
        </p>
        <EmptyState
          icon="search"
          title="No data for this category"
          description="It may have been renamed or deleted. Pick a category from Home to see its detail here."
          action={{ label: 'Back to Home', onClick: () => window.history.back() }}
        />
      </div>
    )
  }

  const pctOfBudget = monthlyBudget > 0 ? Math.round((stats.thisMonth / monthlyBudget) * 100) : null

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-[12.5px] text-[var(--ink-3)]">
          <Link to="/dashboard">Home</Link> ·{' '}
          <span className="text-[var(--ink-4)]">{category}</span>
        </p>
        <div className="verdict">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="eyebrow">Category · {monthLabel}</p>
            {isLoading ? (
              <Skeleton className="h-16 w-64" />
            ) : (
              <>
                <span className="hero-num neg num">{formatCurrency(stats.thisMonth)}</span>
                <p className="verdict-line">
                  {pctOfBudget !== null ? (
                    <>
                      <b>{pctOfBudget}%</b> of a {formatCurrency(monthlyBudget)} budget
                      {isCurrentMonth && daysLeftInMonth > 0
                        ? `, with ${daysLeftInMonth} day${daysLeftInMonth === 1 ? '' : 's'} left`
                        : ''}
                      .
                    </>
                  ) : (
                    <>
                      <b>{Math.round(stats.shareOfSpend * 100)}%</b> of all spend this month · no
                      budget set for {category}.
                    </>
                  )}{' '}
                  {dominant && dominant.share >= 0.3 && (
                    <>
                      One transaction on{' '}
                      {new Date(dominant.txn.txn_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      is <b>{Math.round(dominant.share * 100)}%</b> of the total — without it{' '}
                      {pctOfBudget !== null && pctOfBudget > 100
                        ? 'you would be inside the plan.'
                        : 'the month would look very different.'}
                    </>
                  )}
                </p>
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="eyebrow">Period</span>
            <YearMonthSelector year={year} month={month} onPeriodChange={setPeriod} />
          </div>
        </div>
      </section>

      <CategoryTrendChart
        category={category}
        series={series}
        isDark={isDark}
        isLoading={isLoading}
      />

      <section className="sec">
        <div className="card card-flush">
          <div className="stats">
            <div>
              <span className="eyebrow">Median month</span>
              <span className="v num">{formatCurrency(stats.medianMonth)}</span>
              <span className="text-[12.5px] text-[var(--ink-3)]">{series.length} months</span>
            </div>
            <div>
              <span className="eyebrow">Biggest month</span>
              <span className="v num">{formatCurrency(stats.biggestMonth?.amount ?? 0)}</span>
              <span className="text-[12.5px] text-[var(--ink-3)]">
                {stats.biggestMonth
                  ? `${stats.biggestMonth.label} ${stats.biggestMonth.year}`
                  : '—'}
              </span>
            </div>
            <div>
              <span className="eyebrow">This month</span>
              <span className="v num">{formatCurrency(stats.thisMonth)}</span>
              <span className="text-[12.5px] text-[var(--ink-3)]">
                {stats.thisMonthRank === 1
                  ? 'highest on record'
                  : `${stats.thisMonthRank}${stats.thisMonthRank === 2 ? 'nd' : stats.thisMonthRank === 3 ? 'rd' : 'th'} highest on record`}
              </span>
            </div>
            <div>
              <span className="eyebrow">Transactions</span>
              <span className="v num">{stats.txnCount}</span>
              <span className="text-[12.5px] text-[var(--ink-3)]">
                median {formatCurrency(stats.medianTicket)}
              </span>
            </div>
            <div>
              <span className="eyebrow">Share of spend</span>
              <span className="v num">{Math.round(stats.shareOfSpend * 100)}%</span>
              <span className="text-[12.5px] text-[var(--ink-3)]">
                {stats.prevShareOfSpend !== null
                  ? `was ${Math.round(stats.prevShareOfSpend * 100)}% last month`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <CategoryBreakdown merchants={merchants} tags={tags} isLoading={isLoading} />

      <CategoryTransactionsTable
        txns={monthTxns}
        monthLabel={monthLabel}
        openInTransactionsHref={openInTransactionsHref}
        isLoading={isLoading}
      />
    </div>
  )
}
