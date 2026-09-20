import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { computeHabits, computeTagSpend } from '@/features/dashboard/lib/habits'
import { detectRecurring } from '@/features/dashboard/lib/recurring'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { getSplitLedger } from '@/lib/api/dashboard'
import { getCurrentPeriod, resolvePeriodMonth } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

import { useAllProcessedTransactions } from '../dashboard/hooks/useAllProcessedTransactions'

import { CommitmentsSection } from './components/CommitmentsSection'
import { DowForecastSection } from './components/DowForecastSection'
import { HabitsSection } from './components/HabitsSection'
import { HeatmapSection } from './components/HeatmapSection'
import { PeopleSection } from './components/PeopleSection'
import { useBudgetLookup } from './hooks/useBudgetLookup'
import { computeDowAverages, computeNextMonthForecast } from './lib/forecast'
import { computeHabitSpans, totalWindowSpend } from './lib/habitsExtra'
import { buildHeatmapRows, topCategoriesBySpend } from './lib/heatmap'

const HABITS_MONTHS = 12
const HEATMAP_MONTHS = 12
const HEATMAP_ROW_COUNT = 8

/**
 * Insights (/insights) — the slow-moving picture behind this month. Six
 * sections: habits, when it happens (heatmap), which day + what's next,
 * every commitment, and people. Reached from Home, not a primary tab — see
 * design-system/kosh-ledger/MASTER.md §7.
 *
 * design-system/kosh-ledger/pages/dashboard.md: "computeHabits,
 * computeTagSpend, computeSeasonality and the YTD helpers move to the
 * Insights route — the engines are unchanged, only their mount point
 * moves." This page is that mount point.
 */
export function InsightsPage() {
  const now = useMemo(() => new Date(), [])
  const { mode } = usePeriodMode()

  const { transactions: allHistory, isLoading: historyLoading } = useAllProcessedTransactions()

  // ── Habits (§2) ──────────────────────────────────────────────────────────
  const habits = useMemo(() => computeHabits(allHistory, now, HABITS_MONTHS), [allHistory, now])
  const tagSpend = useMemo(() => computeTagSpend(allHistory, now, HABITS_MONTHS), [allHistory, now])
  const habitSpans = useMemo(
    () => computeHabitSpans(allHistory, now, HABITS_MONTHS),
    [allHistory, now]
  )
  const habitsWindowSpend = useMemo(
    () => totalWindowSpend(allHistory, now, HABITS_MONTHS),
    [allHistory, now]
  )

  // ── When it happens (§3) ────────────────────────────────────────────────
  const { budgetFor, isLoading: budgetLoading } = useBudgetLookup(now)
  const heatmapCategories = useMemo(
    () => topCategoriesBySpend(allHistory, HEATMAP_ROW_COUNT),
    [allHistory]
  )
  const heatmapRows = useMemo(
    () => buildHeatmapRows(allHistory, heatmapCategories, now, HEATMAP_MONTHS, budgetFor),
    [allHistory, heatmapCategories, now, budgetFor]
  )

  // ── Which day, and what's next (§4) ─────────────────────────────────────
  const dow = useMemo(() => computeDowAverages(allHistory), [allHistory])
  const forecast = useMemo(() => computeNextMonthForecast(allHistory, now), [allHistory, now])
  const allCategories = useMemo(() => [...new Set(allHistory.map((t) => t.category))], [allHistory])
  const forecastPlan = useMemo(
    () => allCategories.reduce((s, cat) => s + budgetFor(cat, forecast.year, forecast.month), 0),
    [allCategories, forecast.year, forecast.month, budgetFor]
  )

  // ── Every commitment (§5) ───────────────────────────────────────────────
  const recurring = useMemo(() => detectRecurring(allHistory, now), [allHistory, now])

  // ── People (§6) ──────────────────────────────────────────────────────────
  const [includeSettled, setIncludeSettled] = useState(false)
  const { year: periodYear, month: periodMonth } = getCurrentPeriod(mode, now)
  const { year: calYear, month: calMonth } = resolvePeriodMonth(periodYear, periodMonth, mode)

  const ledgerQuery = useQuery({
    queryKey: qk.dashboard.splitLedger(periodYear, periodMonth, includeSettled, mode),
    queryFn: () => getSplitLedger(periodYear, periodMonth, includeSettled, mode),
  })
  const ledger = ledgerQuery.data ?? []

  const openItemsByPerson = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of allHistory) {
      const d = new Date(t.txn_date)
      if (d.getFullYear() !== calYear || d.getMonth() + 1 !== calMonth) continue
      for (const share of t.shares) {
        if (!includeSettled && share.settled) continue
        const list = map.get(share.person_name) ?? []
        if (!list.includes(t.description)) list.push(t.description)
        map.set(share.person_name, list)
      }
    }
    return map
  }, [allHistory, calYear, calMonth, includeSettled])

  // ── One page-level loading state, not six independent spinners ─────────
  const isLoading = historyLoading || budgetLoading

  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">Patterns · last 15 months</p>
        <p className="verdict-line mt-3 text-[19px]">
          Nothing here needs a decision today. It is the slow-moving picture behind{' '}
          <Link to="/dashboard">this month</Link>.
        </p>
      </section>

      <HabitsSection
        result={habits}
        tagSpend={tagSpend}
        spans={habitSpans}
        totalWindowSpend={habitsWindowSpend}
        isLoading={isLoading}
      />

      <HeatmapSection rows={heatmapRows} isLoading={isLoading} />

      <DowForecastSection dow={dow} forecast={forecast} plan={forecastPlan} isLoading={isLoading} />

      <CommitmentsSection recurring={recurring} isLoading={isLoading} />

      <PeopleSection
        ledger={ledger}
        openItemsByPerson={openItemsByPerson}
        includeSettled={includeSettled}
        onToggleSettled={() => setIncludeSettled((v) => !v)}
        isLoading={isLoading || ledgerQuery.isLoading}
      />
    </div>
  )
}
