import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { GettingStartedChecklist } from '@/components/onboarding/GettingStartedChecklist'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { onboardingStorage } from '@/lib/onboardingStorage'
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
import { SectionPillBar } from './components/SectionPillBar'
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

  // ── Onboarding (welcome modal + Getting Started checklist) ─────────────────
  // Initial state is derived from localStorage to avoid the modal/checklist
  // briefly flashing-then-vanishing on mount. The two flags are intentionally
  // independent — dismissing the welcome modal does NOT hide the checklist,
  // which persists until the user explicitly dismisses it or completes all
  // four steps (handled inside GettingStartedChecklist).
  const [welcomeOpen, setWelcomeOpen] = useState(() => !onboardingStorage.isOnboarded())
  const [showChecklist, setShowChecklist] = useState(
    () => !onboardingStorage.isChecklistDismissed()
  )
  function handleWelcomeGetStarted() {
    onboardingStorage.setOnboarded(true)
    setWelcomeOpen(false)
  }
  function handleWelcomeSkip() {
    onboardingStorage.setOnboarded(true)
    setWelcomeOpen(false)
  }

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
  const sections = [
    { id: 'sec-overview', label: 'Overview' },
    { id: 'sec-budget', label: 'Budget' },
    { id: 'sec-categories', label: 'Categories' },
    { id: 'sec-trend', label: 'Trend' },
    { id: 'sec-ytd', label: 'YTD' },
    { id: 'sec-splits', label: 'Splits' },
  ]

  return (
    <div className="dashboard-page space-y-4">
      {welcomeOpen && (
        <WelcomeModal onGetStarted={handleWelcomeGetStarted} onSkip={handleWelcomeSkip} />
      )}
      {showChecklist && <GettingStartedChecklist onDismiss={() => setShowChecklist(false)} />}
      <SectionPillBar sections={sections} />
      <section id="sec-overview">
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
      </section>

      <section id="sec-budget">
        <BudgetPaceBars
          budgetRows={data.budgetRows}
          paceAt={paceAt}
          dayOfMonth={dayOfMonth}
          isLoading={data.summaryLoading}
        />
      </section>

      <section id="sec-categories" className="space-y-4">
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
      </section>

      <section id="sec-trend">
        <SixMonthTrend
          stackedTrendData={data.stackedTrendData}
          stackCategories={data.stackCategories}
          trendMode={trendMode}
          onTrendModeChange={setTrendMode}
          isLoading={data.trendQueriesLoading}
          isDark={isDark}
        />
      </section>

      <section id="sec-ytd">
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
      </section>

      <section id="sec-splits" className="space-y-4">
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
      </section>
    </div>
  )
}
