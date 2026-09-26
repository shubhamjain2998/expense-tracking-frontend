import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { YearMonthSelector } from '@/components/ui/YearMonthSelector'
import { useWorldSupported } from '@/components/world/support'
import { useAllProcessedTransactions } from '@/features/dashboard/hooks/useAllProcessedTransactions'
import { MONTH_LABELS_FULL } from '@/features/dashboard/lib/chartTheme'
import { usePeriod } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { getBudget } from '@/lib/api/budget'
import { formatCurrency, formatShortDate } from '@/lib/format'
import { calendarToPeriod, resolvePeriodMonth } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

import { CategoryBreakdown } from './components/CategoryBreakdown'
import { CategoryTransactionsTable } from './components/CategoryTransactionsTable'
import { CategoryTrendChart } from './components/CategoryTrendChart'
import {
  categoryFlow,
  categoryMonthBudget,
  categoryMonthlySeries,
  computeCategoryStats,
  dominantTransaction,
  merchantBreakdown,
  tagBreakdown,
  txnCalMonth,
} from './lib/categoryStats'
import { CategoryWorld } from './world/CategoryWorld'
import { buildBreakdown, buildDays, buildMonths } from './world/stationData'
import './world/world.css'

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

  const navigate = useNavigate()
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
  // Plans are stored per *period* year — the Budget page reads
  // getBudget(year) with the picker's year — so this must too. Reading the
  // calendar year picked the wrong plan for Jan–Mar in FY mode.
  const budgetQuery = useQuery({
    queryKey: qk.budget.byYear(year),
    queryFn: () => getBudget(year),
    // GET /budget/{year} legitimately 404s when this category's year has no
    // budget plan yet — a valid "no budget" response, not a transient
    // failure.
    retry: false,
    throwOnError: false,
  })

  // ── Derived transaction sets ─────────────────────────────────────────────
  const categoryExists = useMemo(
    () => allHistory.some((t) => t.category === category),
    [allHistory, category]
  )
  // Salary, dividends and the like are income: the page reads their income
  // transactions, which an expense-only filter showed as an empty ₹0 month.
  const flow = useMemo(() => categoryFlow(allHistory, category), [allHistory, category])
  const isIncome = flow === 'income'
  // Budgets are spending plans; an income category never has one.
  const monthlyBudget = isIncome ? 0 : categoryMonthBudget(budgetQuery.data, category)

  const monthTxns = useMemo(
    () =>
      allHistory.filter((t) => {
        if (t.category !== category || t.txn_type !== flow) return false
        const d = txnCalMonth(t)
        return d.year === calYear && d.month === calMonth
      }),
    [allHistory, category, flow, calYear, calMonth]
  )
  const allTxnsThisMonth = useMemo(
    () =>
      allHistory.filter((t) => {
        if (t.txn_type !== flow) return false
        const d = txnCalMonth(t)
        return d.year === calYear && d.month === calMonth
      }),
    [allHistory, flow, calYear, calMonth]
  )
  const allTxnsPrevMonth = useMemo(
    () =>
      allHistory.filter((t) => {
        if (t.txn_type !== flow) return false
        const d = txnCalMonth(t)
        return d.year === prevCal.year && d.month === prevCal.month
      }),
    [allHistory, flow, prevCal.year, prevCal.month]
  )

  const series = useMemo(
    () => categoryMonthlySeries(allHistory, category, calYear, calMonth, TREND_MONTHS, flow),
    [allHistory, category, calYear, calMonth, flow]
  )
  const stats = useMemo(
    () => computeCategoryStats(series, monthTxns, allTxnsThisMonth, allTxnsPrevMonth, flow),
    [series, monthTxns, allTxnsThisMonth, allTxnsPrevMonth, flow]
  )
  const merchants = useMemo(() => merchantBreakdown(monthTxns, flow), [monthTxns, flow])
  const tags = useMemo(() => tagBreakdown(monthTxns, flow), [monthTxns, flow])
  const dominant = useMemo(() => dominantTransaction(monthTxns, flow), [monthTxns, flow])

  const isLoading = historyLoading || budgetQuery.isLoading

  // ── 3D world (wide screens with WebGL) ─────────────────────────────────────
  const worldSupported = useWorldSupported()
  const [breakdownHighlight, setBreakdownHighlight] = useState<string | null>(null)
  const [txnHighlight, setTxnHighlight] = useState<string | null>(null)
  // Columns carry a budget cap only for months in the budget (period) year
  // the page has loaded.
  const worldMonths = useMemo(
    () =>
      buildMonths(series, (y, m) =>
        !isIncome && calendarToPeriod(y, m, mode).year === year
          ? categoryMonthBudget(budgetQuery.data, category)
          : 0
      ),
    [series, year, mode, isIncome, budgetQuery.data, category]
  )
  const worldBreakdown = useMemo(() => buildBreakdown(merchants, tags), [merchants, tags])
  const worldDays = useMemo(
    () => buildDays(monthTxns, calYear, calMonth),
    [monthTxns, calYear, calMonth]
  )

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
          <span className="text-[var(--ink-3)]">{category}</span>
        </p>
        <EmptyState
          icon="search"
          title="No data for this category"
          description="It may have been renamed or deleted. Pick a category from Home to see its detail here."
          action={{ label: 'Back to Home', onClick: () => navigate('/dashboard') }}
        />
      </div>
    )
  }

  const pctOfBudget = monthlyBudget > 0 ? Math.round((stats.thisMonth / monthlyBudget) * 100) : null

  const header = (
    <section>
      <p className="mb-3 text-[12.5px] text-[var(--ink-3)]">
        <Link to="/dashboard">Home</Link> · <span className="text-[var(--ink-3)]">{category}</span>
      </p>
      <div className="verdict">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="eyebrow">Category · {monthLabel}</p>
          {isLoading ? (
            <Skeleton className="h-16 w-64" />
          ) : (
            <>
              <span className={`hero-num num ${isIncome ? 'pos' : 'neg'}`}>
                {formatCurrency(stats.thisMonth)}
              </span>
              <p className="verdict-line">
                {pctOfBudget !== null ? (
                  <>
                    <b>{pctOfBudget}%</b> of a {formatCurrency(monthlyBudget)} budget
                    {isCurrentMonth && daysLeftInMonth > 0
                      ? `, with ${daysLeftInMonth} day${daysLeftInMonth === 1 ? '' : 's'} left`
                      : ''}
                    .
                  </>
                ) : isIncome ? (
                  <>
                    <b>{Math.round(stats.shareOfSpend * 100)}%</b> of all income this month.
                  </>
                ) : (
                  <>
                    <b>{Math.round(stats.shareOfSpend * 100)}%</b> of all spend this month · no
                    budget set for {category}.
                  </>
                )}{' '}
                {/* A lone transaction is the whole month by definition. */}
                {dominant && stats.txnCount > 1 && dominant.share >= 0.3 && (
                  <>
                    One transaction on {formatShortDate(dominant.txn.txn_date)} is{' '}
                    <b>{Math.round(dominant.share * 100)}%</b> of the total — without it{' '}
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
  )

  const statsStrip = (
    <section className="sec">
      <div className="card card-flush">
        {/* Figures wait for the history, like the hero: a strip of ₹0s would
            read as a real, empty month while it loads. */}
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
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
                {stats.thisMonth === 0
                  ? 'none this month'
                  : stats.thisMonthRank === 1
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
              <span className="eyebrow">{isIncome ? 'Share of income' : 'Share of spend'}</span>
              <span className="v num">{Math.round(stats.shareOfSpend * 100)}%</span>
              <span className="text-[12.5px] text-[var(--ink-3)]">
                {stats.prevShareOfSpend !== null
                  ? `was ${Math.round(stats.prevShareOfSpend * 100)}% last month`
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )

  const trendChart = (showChart: boolean) => (
    <CategoryTrendChart
      category={category}
      series={series}
      isDark={isDark}
      isLoading={isLoading}
      showChart={showChart}
    />
  )

  const table = (
    <CategoryTransactionsTable
      txns={monthTxns}
      monthLabel={monthLabel}
      openInTransactionsHref={openInTransactionsHref}
      isLoading={isLoading}
      highlight={worldSupported ? txnHighlight : null}
      onHighlight={worldSupported ? setTxnHighlight : undefined}
      scrollBody={worldSupported}
    />
  )

  if (worldSupported) {
    return (
      <div className="cat-world">
        <CategoryWorld
          category={category}
          panels={[
            <div key="trend" className="space-y-8">
              {header}
              {trendChart(false)}
              {statsStrip}
            </div>,
            <CategoryBreakdown
              key="breakdown"
              merchants={merchants}
              tags={tags}
              isLoading={isLoading}
              stacked
              highlight={breakdownHighlight}
              onHighlight={setBreakdownHighlight}
            />,
            table,
          ]}
          months={worldMonths}
          breakdown={worldBreakdown}
          days={worldDays}
          breakdownHighlight={breakdownHighlight}
          onBreakdownHighlight={setBreakdownHighlight}
          txnHighlight={txnHighlight}
          onTxnHighlight={setTxnHighlight}
          onPickMonth={(c) => {
            const p = calendarToPeriod(c.year, c.month, mode)
            setPeriod(p.year, p.month)
          }}
          isDark={isDark}
          isIncome={isIncome}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {header}

      {trendChart(true)}

      {statsStrip}

      <CategoryBreakdown merchants={merchants} tags={tags} isLoading={isLoading} />

      {table}
    </div>
  )
}
