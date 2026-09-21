import { useCallback, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import type { InsightsRunOut } from '@/lib/api/insights'

import { toStakeRows } from '../lib/insightsDerive'
import { formatInsightsValue } from '../lib/insightsFormat'

import { FindingRow } from './FindingRow'
import { ImpactBars } from './ImpactBars'
import { InsightsChartCard } from './InsightsChartCard'
import { MetricStrip } from './MetricStrip'
import { PatternsSection } from './PatternsSection'

interface InsightsRunViewProps {
  run: InsightsRunOut
  isDark: boolean
  onRegenerate: () => void
  onDiscard: () => Promise<void>
  isDiscarding: boolean
}

function formatRunTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * The run-exists state: everything below comes verbatim from the user's own
 * LLM reply, stored as-is (`InsightsRunOut.payload`). Every string is
 * rendered as text — never `dangerouslySetInnerHTML` — since it's untrusted,
 * hand-pasted content (see insightsResponseSchema.ts's docblock).
 *
 * An LLM writes paragraphs, and eight of them stacked is a page nobody
 * finishes. So the page shows the shape of the answer first — the verdict,
 * the ratios, and a ranked bar per finding — and opens the reasoning only
 * where the reader asks for it. Nothing is dropped; the order is by how much
 * of it is needed at a glance.
 *
 * Reading order stays non-overlapping: verdict, the ratios behind it, what's
 * at stake, what to decide about, what's simply true of the behaviour, what's
 * coming, the charts, then what the data can't settle. MASTER.md §8's "no two
 * views answer the same question" applies to LLM prose as much as to charts.
 */
export function InsightsRunView({
  run,
  isDark,
  onRegenerate,
  onDiscard,
  isDiscarding,
}: InsightsRunViewProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [showBasis, setShowBasis] = useState(false)
  const { payload } = run

  // The first finding is ranked most important by the LLM, so it opens by
  // default — a page of closed rows reads as empty.
  const [openFindings, setOpenFindings] = useState<Set<string>>(
    () => new Set(payload.findings[0] ? [payload.findings[0].id] : [])
  )
  const findingRefs = useRef(new Map<string, HTMLDivElement | null>())

  const stakeRows = useMemo(() => toStakeRows(payload.findings), [payload.findings])

  const toggleFinding = useCallback((id: string) => {
    setOpenFindings((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** A bar names a finding, so picking one opens it and moves to it rather
   *  than leaving the reader to find the row themselves. The scroll is
   *  feature-checked: `scrollIntoView` does not exist in jsdom, and opening
   *  the row is the part that must not depend on it. */
  const revealFinding = useCallback((id: string) => {
    setOpenFindings((prev) => new Set(prev).add(id))
    const node = findingRefs.current.get(id)
    if (typeof node?.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [])

  return (
    <section className="sec space-y-4">
      <div className="sec-head">
        <h2 className="sec-title">Insights</h2>
        <span className="sub">Last run {formatRunTimestamp(run.ran_at)}</span>
        <span className="act flex gap-2">
          <Button variant="secondary" size="sm" onClick={onRegenerate}>
            <Icon name="refresh" size={13} />
            Regenerate
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => setConfirmDiscard(true)}>
            <Icon name="delete" size={13} />
            Discard
          </Button>
        </span>
      </div>

      <div className="card">
        <p className="verdict-line text-[17px]">{payload.verdict}</p>
      </div>

      <MetricStrip metrics={payload.metrics} />

      <ImpactBars rows={stakeRows} onSelect={revealFinding} />

      <div className="card card-flush">
        {payload.findings.map((f) => (
          <div
            key={f.id}
            ref={(node) => {
              findingRefs.current.set(f.id, node)
            }}
          >
            <FindingRow
              finding={f}
              isOpen={openFindings.has(f.id)}
              onToggle={() => toggleFinding(f.id)}
            />
          </div>
        ))}
      </div>

      <PatternsSection patterns={payload.patterns} />

      {payload.projection && (
        <div className="card">
          <p className="card-title flex items-center gap-1.5">
            <Icon name="calendar_today" size={14} />
            {payload.projection.label}
          </p>
          <p className="v num mt-2 block">
            {formatInsightsValue(payload.projection.value, payload.projection.unit)}
          </p>
          <button
            type="button"
            className="metric-read mt-1"
            onClick={() => setShowBasis((v) => !v)}
            aria-expanded={showBasis}
          >
            {showBasis ? payload.projection.basis : 'What this assumes'}
          </button>
        </div>
      )}

      {payload.charts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {payload.charts.map((chart) => (
            <InsightsChartCard key={chart.id} chart={chart} isDark={isDark} />
          ))}
        </div>
      )}

      {payload.questions.length > 0 && (
        <div className="card">
          <p className="card-title flex items-center gap-1.5">
            <Icon name="help_outline" size={14} />
            Only you can answer these
          </p>
          <ul className="mt-2 space-y-2">
            {payload.questions.map((q) => (
              <li
                key={q}
                className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--ink-2)]"
              >
                <span
                  aria-hidden="true"
                  className="mt-[7px] h-1 w-1 flex-none rounded-full bg-[var(--ink-4)]"
                />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDiscard}
        title="Discard this insights run?"
        message="This removes the verdict, findings and charts below. You can always generate a fresh prompt and paste a new run afterwards."
        confirmLabel="Discard"
        cancelLabel="Cancel"
        danger
        loading={isDiscarding}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          void onDiscard().then(() => setConfirmDiscard(false))
        }}
      />
    </section>
  )
}
