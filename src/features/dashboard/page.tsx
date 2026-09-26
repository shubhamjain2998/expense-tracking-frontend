import { motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'

import { GettingStartedChecklist } from '@/components/onboarding/GettingStartedChecklist'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { useWorldSupported } from '@/components/world/support'
import { usePeriod } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { onboardingStorage } from '@/lib/onboardingStorage'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import { calendarToPeriod, getCurrentPeriod, resolvePeriodMonth } from '@/lib/period'

import { TrendBlock } from './components/TrendBlock'
import { VerdictBlock } from './components/VerdictBlock'
import { WhereItWent } from './components/WhereItWent'
import { YearBlock } from './components/YearBlock'
import { useAllProcessedTransactions } from './hooks/useAllProcessedTransactions'
import { useDashboardData } from './hooks/useDashboardData'
import { MONTH_LABELS_FULL } from './lib/chartTheme'
import { computeInsights } from './lib/insights'
import { detectRecurring } from './lib/recurring'
import { computeSeasonality } from './lib/seasonality'
import { computeYearOutlook } from './lib/yearOutlook'
import { buildYearTerrain } from './lib/yearTerrain'
import { HomeWorld } from './world/HomeWorld'
import { buildTowers, buildTrend, buildVessel } from './world/stationData'

const BLOCK_KEYS = ['verdict', 'where', 'year', 'trend'] as const

/**
 * Home (/) — four blocks, in this order: verdict, where it went, the year,
 * trend. Nothing else renders here. On wide screens with WebGL the blocks
 * become the panels of a 3D world (world/HomeWorld.tsx) whose stage draws
 * what their charts would; elsewhere they stack as a flat page.
 *
 * design-system/kosh-ledger/pages/dashboard.md is the spec. Habits,
 * seasonality detail, weekday patterns, the full commitment list and the
 * people ledger live at /insights; per-category detail lives at
 * /c/:categoryId.
 */
export function DashboardPage() {
  // Stable per-mount "now" so the cross-period engine memos can be preserved
  // (a fresh `new Date()` each render would invalidate them every time).
  const now = useMemo(() => new Date(), [])
  const { isDark } = useThemeContext()
  const { mode } = usePeriodMode()

  // ── UI state ───────────────────────────────────────────────────────────────────────────────
  const { year, month, setPeriod } = usePeriod()
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
  // A month after this one hasn't started: day 0, nothing expected yet. It
  // used to count as finished, so November read "day 30 of 30 · the month
  // closes ₹1.9L under budget" in September.
  const isFutureMonth = calYear * 12 + calMonth > now.getFullYear() * 12 + now.getMonth() + 1
  const dayOfMonth = isCurrentMonth
    ? now.getDate()
    : isFutureMonth
      ? 0
      : new Date(calYear, calMonth, 0).getDate()
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
  const { transactions: allHistory } = useAllProcessedTransactions()

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

  // The year block reads today's position in the selected year, not the
  // picker's month — a past month selected mid-year still projects from today.
  const yearFraction = useMemo(() => {
    const current = getCurrentPeriod(mode, now)
    const daysInToday = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return year === current.year ? now.getDate() / daysInToday : 1
  }, [mode, year, now])
  const yearOutlook = useMemo(
    () => computeYearOutlook(data.yearlyTrendData, mode, data.monthsElapsedYtd, yearFraction),
    [data.yearlyTrendData, data.monthsElapsedYtd, mode, yearFraction]
  )
  // Same year, split by category, for the world's year station.
  const yearTerrain = useMemo(
    () =>
      buildYearTerrain({
        txns: allHistory,
        summaryRows: data.summaryRows,
        year,
        mode,
        now,
        monthFraction: yearFraction,
      }),
    [allHistory, data.summaryRows, year, mode, now, yearFraction]
  )

  // ── 3D world (wide screens with WebGL) ─────────────────────────────────────
  const worldSupported = useWorldSupported()
  const [highlight, setHighlight] = useState<string | null>(null)
  const vessel = useMemo(
    () =>
      buildVessel({
        income: data.totalIncome,
        spent: data.totalDebit,
        budget: data.totalBudget,
        paceAt,
      }),
    [data.totalIncome, data.totalDebit, data.totalBudget, paceAt]
  )
  const towers = useMemo(() => buildTowers(data.summaryRows, paceAt), [data.summaryRows, paceAt])
  const trend = useMemo(() => buildTrend(data.incomeTrendData), [data.incomeTrendData])

  // ── Render ──────────────────────────────────────────────────────────────────────────────────
  // The four blocks, in order. In the world they're the panels beside the
  // stage and the stage draws what their charts would; flat, they stack.
  const blocks: [ReactNode, ReactNode, ReactNode, ReactNode] = [
    <VerdictBlock
      key="verdict"
      verdict={insightsResult.verdict}
      totalIncome={data.totalIncome}
      totalDebit={data.totalDebit}
      dayOfMonth={dayOfMonth}
      daysInMonth={daysInMonth}
      currentMonthLabel={currentMonthLabel ?? ''}
      displayYear={calYear}
      selectorYear={year}
      selectorMonth={month}
      onPeriodChange={setPeriod}
      // The hint names a calendar month; setPeriod takes a period month (in FY
      // mode June is month 3). Passing it straight through sent "last
      // activity June 2026" to September.
      onPeriodJump={(calY, calM) => {
        const p = calendarToPeriod(calY, calM, mode)
        setPeriod(p.year, p.month)
      }}
      isLoading={data.summaryLoading}
      lastActiveMonthHint={data.lastActiveMonthHint}
    />,
    <WhereItWent
      key="where"
      summaryRows={data.summaryRows}
      budgetRows={data.budgetRows}
      paceAt={paceAt}
      year={year}
      month={month}
      isLoading={data.summaryLoading}
      highlight={worldSupported ? highlight : null}
      onHighlight={worldSupported ? setHighlight : undefined}
    />,
    <YearBlock
      key="year"
      outlook={yearOutlook}
      annualPlan={data.annualBudget}
      year={year}
      mode={mode}
      monthsElapsed={data.monthsElapsedYtd}
      isLoading={data.yearlyTrendLoading || data.ytdLoading}
      isDark={isDark}
      showChart={!worldSupported}
    />,
    <TrendBlock
      key="trend"
      incomeTrendData={data.incomeTrendData}
      trendWindow={trendWindow}
      onTrendWindowChange={setTrendWindow}
      isLoading={data.allTxnLoading || data.incomeQueriesLoading}
      isDark={isDark}
      showChart={!worldSupported}
    />,
  ]

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

      {worldSupported ? (
        <motion.div variants={fadeUp}>
          <HomeWorld
            panels={blocks}
            vessel={vessel}
            towers={towers}
            terrain={yearTerrain}
            trend={trend}
            highlight={highlight}
            onHighlight={setHighlight}
            year={year}
            month={month}
            isDark={isDark}
          />
        </motion.div>
      ) : (
        blocks.map((block, i) => (
          <motion.div key={BLOCK_KEYS[i]} variants={fadeUp}>
            {block}
          </motion.div>
        ))
      )}
    </motion.div>
  )
}
