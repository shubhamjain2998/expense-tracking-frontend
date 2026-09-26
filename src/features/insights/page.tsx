import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { useWorldSupported } from '@/components/world/support'
import { usePeriod } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { useToastContext } from '@/hooks/useToastContext'
import { getSplitLedger } from '@/lib/api/dashboard'
import { resolvePeriodMonth } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

import { useAllProcessedTransactions } from '../dashboard/hooks/useAllProcessedTransactions'

import { InsightsRunView, type RunViewParts } from './components/InsightsRunView'
import { PeopleSection } from './components/PeopleSection'
import { PromptWorkflow } from './components/PromptWorkflow'
import { useInsightsRun } from './hooks/useInsightsRun'
import { computeInsightsAggregates } from './lib/insightsAggregates'
import type { InsightsPayload } from './lib/insightsResponseSchema'
import { InsightsWorld } from './world/InsightsWorld'
import { buildBeams, buildMonthRing } from './world/stationData'

/**
 * Insights (/insights) — no longer a formula-driven analysis page. The user
 * generates a prompt built from their own data, runs it through an LLM of
 * their choice, and pastes the reply back; that reply (verdict + findings +
 * charts) becomes the entire page. People/split-ledger is the one surviving
 * analytical section — it's an action surface (Settle), not an analysis
 * panel, so it isn't replaced by the LLM.
 *
 * See design-system/kosh-ledger/MASTER.md §7 — Insights is a drill-down from
 * Home, not a primary nav tab.
 *
 * On wide screens with WebGL the same blocks become the panels of a 3D world
 * (world/InsightsWorld.tsx); elsewhere they stack as a flat page.
 */
export function InsightsPage() {
  const now = useMemo(() => new Date(), [])
  const { mode } = usePeriodMode()
  const { isDark } = useThemeContext()
  const toast = useToastContext()

  const { transactions: allHistory, isLoading: historyLoading } = useAllProcessedTransactions()

  // ── People (kept — action surface, not analysis) ───────────────────────
  const [includeSettled, setIncludeSettled] = useState(false)
  const { year: periodYear, month: periodMonth } = usePeriod()
  const { year: calYear, month: calMonth } = resolvePeriodMonth(periodYear, periodMonth, mode)

  const ledgerQuery = useQuery({
    queryKey: qk.dashboard.splitLedger(periodYear, periodMonth, includeSettled, mode),
    queryFn: () => getSplitLedger(periodYear, periodMonth, includeSettled, mode),
  })
  const ledger = useMemo(() => ledgerQuery.data ?? [], [ledgerQuery.data])

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

  // ── LLM-generated insights ──────────────────────────────────────────────
  const {
    run,
    isLoading: runLoading,
    saveRun,
    isSaving,
    discardRun,
    isDiscarding,
  } = useInsightsRun()
  const [regenerating, setRegenerating] = useState(false)

  // Whole-history split ledger (not period-scoped) feeds the prompt — the
  // aggregates are a 15-month picture, not this month's — so it's built
  // straight from `allHistory`'s per-share data rather than the period-scoped
  // `ledger` query above, which only covers the currently selected month.
  const promptLedgerRows = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of allHistory) {
      for (const share of t.shares) {
        if (share.settled) continue
        totals.set(
          share.person_name,
          (totals.get(share.person_name) ?? 0) + Number(share.share_amount)
        )
      }
    }
    return [...totals.entries()].map(([person_name, total_split_amount]) => ({
      person_name,
      total_split_amount: String(total_split_amount),
    }))
  }, [allHistory])

  const aggregates = useMemo(
    () => computeInsightsAggregates(allHistory, promptLedgerRows, now),
    [allHistory, promptLedgerRows, now]
  )

  const isLoading = historyLoading || runLoading

  async function handleSaveRun(payload: InsightsPayload, periodStart: string, periodEnd: string) {
    await saveRun({ payload, period_start: periodStart, period_end: periodEnd })
    setRegenerating(false)
  }

  async function handleDiscard() {
    try {
      await discardRun()
      toast.success('Insights run discarded.')
    } catch {
      toast.error('Could not discard — try again.')
    }
  }

  // ── 3D world (wide screens with WebGL) ─────────────────────────────────
  const worldSupported = useWorldSupported()
  const [hotFinding, setHotFinding] = useState<string | null>(null)
  const [hotPattern, setHotPattern] = useState<string | null>(null)
  const [hotPerson, setHotPerson] = useState<string | null>(null)
  const ring = useMemo(() => buildMonthRing(aggregates), [aggregates])
  const beams = useMemo(() => buildBeams(ledger), [ledger])

  // ── Render ─────────────────────────────────────────────────────────────
  const intro = (
    <section>
      <p className="eyebrow">Insights</p>
      <p className="verdict-line mt-3 text-[19px]">
        {run
          ? 'The true story behind your money, in your own LLM’s words.'
          : 'Get the true story behind your money — from an LLM, not a formula.'}
      </p>
    </section>
  )

  const showRun = !isLoading && !!run && !regenerating

  const promptBlock = isLoading ? (
    <div className="card">
      <p className="text-[13px] text-[var(--ink-3)]">Loading your data…</p>
    </div>
  ) : (
    <section className="sec space-y-4">
      {!run && (
        <div className="card">
          <p className="card-title flex items-center gap-1.5">
            <Icon name="auto_awesome" size={14} />
            Insights doesn't run on a formula anymore
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-3)]">
            Old Insights derived patterns from a fixed formula, which didn't always tell the true
            story. Now you generate a prompt from your own numbers — category totals, income,
            recurring commitments, and your most notable transactions — paste it into any LLM you
            choose (ChatGPT, Claude, Gemini, …), and paste the reply back here. The LLM's verdict,
            findings and charts become this page.
          </p>
        </div>
      )}
      <PromptWorkflow
        aggregates={aggregates}
        onSave={handleSaveRun}
        isSaving={isSaving}
        onCancel={regenerating ? () => setRegenerating(false) : undefined}
      />
    </section>
  )

  const people = (
    <PeopleSection
      ledger={ledger}
      openItemsByPerson={openItemsByPerson}
      includeSettled={includeSettled}
      onToggleSettled={() => setIncludeSettled((v) => !v)}
      isLoading={historyLoading || ledgerQuery.isLoading}
      highlight={worldSupported ? hotPerson : null}
      onHighlight={worldSupported ? setHotPerson : undefined}
    />
  )

  if (worldSupported) {
    const world = (parts: RunViewParts | null) => (
      <InsightsWorld
        intro={intro}
        run={parts && run ? { payload: run.payload, parts } : null}
        prompt={parts ? null : { panel: promptBlock, ring }}
        people={{ panel: people, beams }}
        hotFinding={hotFinding}
        onHotFinding={setHotFinding}
        hotPattern={hotPattern}
        onHotPattern={setHotPattern}
        hotPerson={hotPerson}
        onHotPerson={setHotPerson}
        isDark={isDark}
      />
    )
    return showRun && run ? (
      <InsightsRunView
        run={run}
        isDark={isDark}
        onRegenerate={() => setRegenerating(true)}
        onDiscard={handleDiscard}
        isDiscarding={isDiscarding}
        highlight={hotFinding}
        onHighlight={setHotFinding}
        patternHighlight={hotPattern}
        onPatternHighlight={setHotPattern}
        renderWorld={world}
      />
    ) : (
      world(null)
    )
  }

  return (
    <div className="space-y-8">
      {intro}

      {showRun && run ? (
        <InsightsRunView
          run={run}
          isDark={isDark}
          onRegenerate={() => setRegenerating(true)}
          onDiscard={handleDiscard}
          isDiscarding={isDiscarding}
        />
      ) : (
        promptBlock
      )}

      {people}
    </div>
  )
}
