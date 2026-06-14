import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { GettingStartedChecklist } from '@/components/onboarding/GettingStartedChecklist'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { onboardingStorage } from '@/lib/onboardingStorage'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import { formatYearLabel, getCurrentPeriod, loadPeriodMode, resolvePeriodMonth } from '@/lib/period'

import { CategorySection } from './components/CategorySection'
import { DailySpendCalendar } from './components/DailySpendCalendar'
import { HabitsPanel } from './components/HabitsPanel'
import { IncomeFlowAndTrend } from './components/IncomeFlowAndTrend'
import { IncomeSummaryCards } from './components/IncomeSummaryCards'
import { NeedsAttention } from './components/NeedsAttention'
import { NeedsReview } from './components/NeedsReview'
import { RecurringPanel } from './components/RecurringPanel'
import { SeasonalityPanel } from './components/SeasonalityPanel'
import { SectionPillBar } from './components/SectionPillBar'
import { SixMonthTrend } from './components/SixMonthTrend'
import { SplitLedger } from './components/SplitLedger'
import { VerdictHeader } from './components/VerdictHeader'
import { YtdSection } from './components/YtdSection'
import { useAllProcessedTransactions } from './hooks/useAllProcessedTransactions'
import { useDashboardData } from './hooks/useDashboardData'
import { MONTH_LABELS_FULL } from './lib/chartTheme'
import { computeHabits, computeTagSpend } from './lib/habits'
import { computeInsights } from './lib/insights'
import { detectRecurring } from './lib/recurring'
import { computeSeasonality } from './lib/seasonality'

export function DashboardPage() {
  // Stable per-mount "now" so the cross-period engine memos can be preserved
  // (a fresh `new Date()` each render would invalidate them every time).
  const now = useMemo(() => new Date(), [])
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
  function setPeriod(y: number, m: number) {
    setSearchParams(
      (p) => {
        p.set('year', String(y))
        p.set('month', String(m))
        return p
      },
      { replace: true }
    )
  }
  const [includeSettled, setIncludeSettled] = useState(false)
  const [trendMode, setTrendMode] = useState<'stacked' | 'total'>('stacked')
  const [trendWindow, setTrendWindow] = useState(6)

  // ── Onboarding (welcome modal + Getting Started checklist) ─────────────────
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
    selectedTagId: '',
    includeSettled,
    mode,
    trendWindow,
  })

  // Full processed-transaction history powers the cross-period engines below.
  const { transactions: allHistory, isLoading: historyLoading } = useAllProcessedTransactions()

  // ── Engines (pure functions over the data the page already has) ──────────────
  const recurring = useMemo(() => detectRecurring(allHistory, now), [allHistory, now])
  const habits = useMemo(() => computeHabits(allHistory, now, 12), [allHistory, now])
  const tagSpend = useMemo(() => computeTagSpend(allHistory, now, 12), [allHistory, now])
  const seasonality = useMemo(
    () => computeSeasonality(allHistory, now, { projectedFY: data.projectedFY }),
    [allHistory, now, data.projectedFY]
  )

  // Trailing average savings rate (0–1) for the savings-drift insight.
  const avgSavingsRate = useMemo(() => {
    const rates = data.incomeTrendData.filter((p) => p.income > 0).map((p) => p.savings / p.income)
    if (rates.length === 0) return null
    return rates.reduce((s, r) => s + r, 0) / rates.length
  }, [data.incomeTrendData])

  const pendingHref = pendingTransactionsUrl(data.pendingItems)

  const insightsResult = useMemo(
    () =>
      computeInsights({
        summaryRows: data.summaryRows,
        pace: paceAt,
        daysLeftInMonth: Math.max(0, daysInMonth - dayOfMonth),
        totalDebit: data.totalDebit,
        totalBudget: data.totalBudget,
        totalIncome: data.totalIncome,
        ledger: data.ledger,
        recurring,
        seasonality,
        avgSavingsRate,
        pendingHref,
      }),
    [
      data.summaryRows,
      data.totalDebit,
      data.totalBudget,
      data.totalIncome,
      data.ledger,
      paceAt,
      daysInMonth,
      dayOfMonth,
      recurring,
      seasonality,
      avgSavingsRate,
      pendingHref,
    ]
  )

  const engineLoading = data.allTxnLoading || historyLoading

  // ── Render ──────────────────────────────────────────────────────────────────────────────────
  const sections = [
    { id: 'sec-verdict', label: 'Verdict' },
    { id: 'sec-month', label: 'Month' },
    { id: 'sec-categories', label: 'Categories' },
    { id: 'sec-recurring', label: 'Recurring' },
    { id: 'sec-habits', label: 'Habits' },
    { id: 'sec-trend', label: 'Trends' },
    { id: 'sec-seasonality', label: 'Seasonality' },
    { id: 'sec-ytd', label: 'YTD' },
    { id: 'sec-splits', label: 'Splits' },
  ]

  return (
    <motion.div
      className="dashboard-page space-y-4"
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="visible"
    >
      {welcomeOpen && (
        <WelcomeModal onGetStarted={handleWelcomeGetStarted} onSkip={handleWelcomeSkip} />
      )}
      {showChecklist && <GettingStartedChecklist onDismiss={() => setShowChecklist(false)} />}
      <SectionPillBar sections={sections} />

      {/* 1 · Verdict + needs attention */}
      <motion.section variants={fadeUp} id="sec-verdict" className="space-y-4">
        <VerdictHeader
          verdict={insightsResult.verdict}
          totalIncome={data.totalIncome}
          totalDebit={data.totalDebit}
          savings={data.totalIncome - data.totalDebit}
          currentMonthLabel={currentMonthLabel ?? ''}
          displayYear={calYear}
          selectorYear={year}
          selectorMonth={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onPeriodJump={setPeriod}
          isLoading={data.summaryLoading}
          pendingCount={data.pendingItems.length}
          pendingUrl={pendingHref}
          lastActiveMonthHint={data.lastActiveMonthHint}
        />
        <NeedsAttention insights={insightsResult.insights} isLoading={engineLoading} />
      </motion.section>

      {/* 2 · Month at a glance */}
      <motion.section variants={fadeUp} id="sec-month">
        <IncomeSummaryCards
          totalIncome={data.totalIncome}
          totalExpenses={data.totalDebit}
          incomeByCategory={data.incomeByCategory}
          isLoading={data.allTxnLoading}
        />
      </motion.section>

      {/* 3 · Category breakdown + budget pace (consolidated) */}
      <motion.section variants={fadeUp} id="sec-categories">
        <CategorySection
          categoryChartData={data.categoryChartData}
          totalDebit={data.totalDebit}
          budgetRows={data.budgetRows}
          paceAt={paceAt}
          dayOfMonth={dayOfMonth}
          categoryStats={data.categoryStats}
          allTransactions={data.allTransactions}
          summaryRows={data.summaryRows}
          daysInMonth={daysInMonth}
          currentMonthLabel={currentMonthLabel ?? ''}
          year={calYear}
          isDark={isDark}
          summaryLoading={data.summaryLoading}
          allTxnLoading={data.allTxnLoading}
        />
      </motion.section>

      {/* 4 · Recurring & subscriptions */}
      <motion.section variants={fadeUp} id="sec-recurring">
        <RecurringPanel result={recurring} isLoading={engineLoading} />
      </motion.section>

      {/* 5 · Habits */}
      <motion.section variants={fadeUp} id="sec-habits">
        <HabitsPanel result={habits} tagSpend={tagSpend} isLoading={engineLoading} />
      </motion.section>

      {/* 6 · Trends */}
      <motion.section variants={fadeUp} id="sec-trend" className="space-y-4">
        <IncomeFlowAndTrend
          totalIncome={data.totalIncome}
          totalExpenses={data.totalDebit}
          incomeTrendData={data.incomeTrendData}
          trendWindow={trendWindow}
          onTrendWindowChange={setTrendWindow}
          isLoading={data.allTxnLoading || data.incomeQueriesLoading}
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
      </motion.section>

      {/* 7 · Seasonality & forecast */}
      <motion.section variants={fadeUp} id="sec-seasonality">
        <SeasonalityPanel result={seasonality} isLoading={engineLoading} />
      </motion.section>

      {/* 8 · Year to date */}
      <motion.section variants={fadeUp} id="sec-ytd">
        <YtdSection
          yearlyTrendData={data.yearlyTrendData}
          month={data.monthsElapsedYtd}
          yearLabel={formatYearLabel(year, mode)}
          isDark={isDark}
          ytdSpentTotal={data.ytdSpentTotal}
          annualBudget={data.annualBudget}
          projectedFY={data.projectedFY}
          ytdLineData={data.ytdLineData}
          ytdComputed={data.ytdComputed}
          isLoading={data.ytdLoading || data.yearlyTrendLoading}
        />
      </motion.section>

      {/* 9 · Splits · Calendar · Needs review */}
      <motion.section variants={fadeUp} id="sec-splits" className="space-y-4">
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
      </motion.section>
    </motion.div>
  )
}
