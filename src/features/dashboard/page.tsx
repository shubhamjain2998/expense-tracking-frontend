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
import { getCurrentPeriod, loadPeriodMode, resolvePeriodMonth } from '@/lib/period'

import { CommittedVsChosen } from './components/CommittedVsChosen'
import { NeedsYou } from './components/NeedsYou'
import { TrendBlock } from './components/TrendBlock'
import { VerdictBlock } from './components/VerdictBlock'
import { WhereItWent } from './components/WhereItWent'
import { useAllProcessedTransactions } from './hooks/useAllProcessedTransactions'
import { useDashboardData } from './hooks/useDashboardData'
import { MONTH_LABELS_FULL } from './lib/chartTheme'
import { computeInsights } from './lib/insights'
import { detectRecurring } from './lib/recurring'
import { computeSeasonality } from './lib/seasonality'

/**
 * Home (/) — five blocks, in this order: verdict, where it went, committed
 * vs chosen, trend, needs you. Nothing else renders here.
 *
 * design-system/kosh-ledger/pages/dashboard.md is the spec. Habits,
 * seasonality detail, weekday patterns, the forecast, the full commitment
 * list and the people ledger live at /insights; per-category detail lives
 * at /c/:categoryId.
 */
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
  const daysLeftInMonth = Math.max(0, daysInMonth - dayOfMonth)
  const currentMonthLabel = MONTH_LABELS_FULL[calMonth]

  // ── Data ────────────────────────────────────────────────────────────────────────────────────
  const data = useDashboardData({
    year,
    month,
    calYear,
    calMonth,
    selectedTagId: '',
    includeSettled: false,
    mode,
    trendWindow,
  })

  // Full processed-transaction history powers the cross-period engines below.
  const { transactions: allHistory, isLoading: historyLoading } = useAllProcessedTransactions()

  // ── Engines (pure functions over the data the page already has) ──────────────
  // computeHabits/computeTagSpend and the YTD helpers move to /insights — their
  // mount point moves, the engines themselves are untouched. computeSeasonality
  // stays here because computeInsights() still needs it as an input.
  const recurring = useMemo(() => detectRecurring(allHistory, now), [allHistory, now])
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

  const pendingHref = pendingTransactionsUrl(data.pendingItems, mode)

  const insightsResult = useMemo(
    () =>
      computeInsights({
        summaryRows: data.summaryRows,
        pace: paceAt,
        daysLeftInMonth,
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
      daysLeftInMonth,
      recurring,
      seasonality,
      avgSavingsRate,
      pendingHref,
    ]
  )

  const engineLoading = data.allTxnLoading || historyLoading

  // ── Render ──────────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-8"
      variants={staggerContainer(0.06)}
      initial="hidden"
      animate="visible"
    >
      {welcomeOpen && (
        <WelcomeModal onGetStarted={handleWelcomeGetStarted} onSkip={handleWelcomeSkip} />
      )}
      {showChecklist && <GettingStartedChecklist onDismiss={() => setShowChecklist(false)} />}

      {/* 1 · Verdict — the only place this month's money figures appear */}
      <motion.div variants={fadeUp}>
        <VerdictBlock
          verdict={insightsResult.verdict}
          totalIncome={data.totalIncome}
          totalDebit={data.totalDebit}
          daysLeftInMonth={daysLeftInMonth}
          dayOfMonth={dayOfMonth}
          daysInMonth={daysInMonth}
          currentMonthLabel={currentMonthLabel ?? ''}
          displayYear={calYear}
          selectorYear={year}
          selectorMonth={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onPeriodJump={setPeriod}
          isLoading={data.summaryLoading}
          lastActiveMonthHint={data.lastActiveMonthHint}
        />
      </motion.div>

      {/* 2 · Where it went — bar list doubles as the budget-pace view */}
      <motion.div variants={fadeUp}>
        <WhereItWent
          summaryRows={data.summaryRows}
          budgetRows={data.budgetRows}
          paceAt={paceAt}
          isLoading={data.summaryLoading}
        />
      </motion.div>

      {/* 3 · Committed vs chosen */}
      <motion.div variants={fadeUp}>
        <CommittedVsChosen
          recurring={recurring}
          totalDebit={data.totalDebit}
          now={now}
          isLoading={engineLoading}
        />
      </motion.div>

      {/* 4 · Trend — the ONE time-series on this page */}
      <motion.div variants={fadeUp}>
        <TrendBlock
          incomeTrendData={data.incomeTrendData}
          trendWindow={trendWindow}
          onTrendWindowChange={setTrendWindow}
          isLoading={data.allTxnLoading || data.incomeQueriesLoading}
          isDark={isDark}
        />
      </motion.div>

      {/* 5 · Needs you — every open loop, nothing else. Ends the page. */}
      <motion.div variants={fadeUp}>
        <NeedsYou
          insights={insightsResult.insights}
          pendingItems={data.pendingItems}
          ledger={data.ledger}
          isLoading={engineLoading || data.ledgerLoading || data.pendingLoading}
        />
      </motion.div>
    </motion.div>
  )
}
