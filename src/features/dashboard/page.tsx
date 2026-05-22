import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { formatYearLabel, getCurrentPeriod, loadPeriodMode, resolvePeriodMonth } from '@/lib/period'

import { BudgetPaceBars } from './components/BudgetPaceBars'
import { CategoryDeepDive } from './components/CategoryDeepDive'
import { CategoryDonutChart } from './components/CategoryDonutChart'
import { CategoryTransactionStats } from './components/CategoryTransactionStats'
import { DailySpendCalendar } from './components/DailySpendCalendar'
import { DashboardHeader } from './components/DashboardHeader'
import { IncomeFlowAndTrend } from './components/IncomeFlowAndTrend'
import { IncomeSummaryCards } from './components/IncomeSummaryCards'
import { NeedsReview } from './components/NeedsReview'
import { SixMonthTrend } from './components/SixMonthTrend'
import { SplitLedger } from './components/SplitLedger'
import { YtdSection } from './components/YtdSection'
import { useDashboardData } from './hooks/useDashboardData'
import { MONTH_LABELS_FULL } from './lib/chartTheme'

export function DashboardPage() {
  const now = new Date()
  const { isDark } = useThemeContext()
  const { mode } = usePeriodMode()

  // ── UI state ───────────────────────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = getCurrentPeriod(loadPeriodMode(), now)
  const year = Number(searchParams.get('year')) || initial.year
  const month = Number(searchParams.get('month')) || initial.month
  function setYear(y: number) {
    setSearchParams(
      (p) => {
        p.set('year', String(y))
        return p
      },
      { replace: true }
    )
  }
  function setMonth(m: number) {
    setSearchParams(
      (p) => {
        p.set('month', String(m))
        return p
      },
      { replace: true }
    )
  }
  const [selectedTagId, setSelectedTagId] = useState('')
  const [includeSettled, setIncludeSettled] = useState(false)
  const [trendMode, setTrendMode] = useState<'stacked' | 'total'>('stacked')

  // ── Date helpers ──────────────────────────────────────────────────────────────────────────
  const { year: calYear, month: calMonth } = resolvePeriodMonth(year, month, mode)
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth() + 1
  // For past months treat the last day as "today" so pace = 100%
  const dayOfMonth = isCurrentMonth ? now.getDate() : new Date(calYear, calMonth, 0).getDate()
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const paceAt = dayOfMonth / daysInMonth
  const currentMonthLabel = MONTH_LABELS_FULL[calMonth]

  // ── Calendar layout ───────────────────────────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay()
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  // ── Data ────────────────────────────────────────────────────────────────────────────────────
  const data = useDashboardData({
    year,
    month,
    calYear,
    calMonth,
    dayOfMonth,
    selectedTagId,
    includeSettled,
    mode,
  })

  const overPaceAmount = data.totalDebit - data.totalBudget * paceAt

  // ── Render ──────────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <DashboardHeader
        totalDebit={data.totalDebit}
        totalBudget={data.totalBudget}
        overPaceAmount={overPaceAmount}
        dayOfMonth={dayOfMonth}
        daysInMonth={daysInMonth}
        currentMonthLabel={currentMonthLabel ?? ''}
        displayYear={calYear}
        selectorYear={year}
        selectorMonth={month}
        onYearChange={setYear}
        onMonthChange={setMonth}
        selectedTagId={selectedTagId}
        onTagChange={setSelectedTagId}
        tags={data.tags}
        isLoading={data.summaryLoading}
        pendingCount={data.pendingItems.length}
      />

      <IncomeSummaryCards
        totalIncome={data.totalIncome}
        totalExpenses={data.totalDebit}
        incomeByCategory={data.incomeByCategory}
        isLoading={data.allTxnLoading}
      />

      <IncomeFlowAndTrend
        totalIncome={data.totalIncome}
        totalExpenses={data.totalDebit}
        incomeTrendData={data.incomeTrendData}
        isLoading={data.allTxnLoading || data.incomeQueriesLoading}
        isDark={isDark}
      />

      <BudgetPaceBars
        budgetRows={data.budgetRows}
        paceAt={paceAt}
        dayOfMonth={dayOfMonth}
        isLoading={data.summaryLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryDonutChart
          data={data.categoryChartData}
          totalDebit={data.totalDebit}
          currentMonthLabel={currentMonthLabel ?? ''}
          year={calYear}
          isLoading={data.summaryLoading}
        />
        <CategoryTransactionStats
          categoryStats={data.categoryStats}
          isLoading={data.allTxnLoading}
        />
      </div>

      <CategoryDeepDive
        allTransactions={data.allTransactions}
        summaryRows={data.summaryRows}
        daysInMonth={daysInMonth}
        currentMonthLabel={currentMonthLabel ?? ''}
        year={calYear}
        isLoading={data.allTxnLoading}
        isDark={isDark}
      />

      <SixMonthTrend
        stackedTrendData={data.stackedTrendData}
        stackCategories={data.stackCategories}
        trendMode={trendMode}
        onTrendModeChange={setTrendMode}
        isLoading={data.trendQueriesLoading}
        isDark={isDark}
      />

      <YtdSection
        yearlyTrendData={data.yearlyTrendData}
        month={month}
        yearLabel={formatYearLabel(year, mode)}
        isDark={isDark}
        ytdSpentTotal={data.ytdSpentTotal}
        annualBudget={data.annualBudget}
        projectedFY={data.projectedFY}
        ytdLineData={data.ytdLineData}
        ytdComputed={data.ytdComputed}
        isLoading={data.ytdLoading || data.yearlyTrendLoading}
      />

      <SplitLedger
        ledger={data.ledger}
        includeSettled={includeSettled}
        onToggleSettled={() => setIncludeSettled((v) => !v)}
        isLoading={data.ledgerLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DailySpendCalendar
          dailySpend={data.dailySpend}
          year={calYear}
          daysInMonth={daysInMonth}
          firstDayOfMonth={firstDayOfMonth}
          totalCells={totalCells}
          currentMonthLabel={currentMonthLabel ?? ''}
          isCurrentMonth={isCurrentMonth}
          isDark={isDark}
        />
        <NeedsReview pendingItems={data.pendingItems} isLoading={data.pendingLoading} />
      </div>
    </div>
  )
}
