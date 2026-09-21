import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { InsightsRunOut } from '@/lib/api/insights'

import { formatInsightsValue } from '../lib/insightsFormat'
import type { InsightsConfidence, InsightsSeverity } from '../lib/insightsResponseSchema'

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

const SEVERITY_META: Record<InsightsSeverity, { cls: string; icon: IconName }> = {
  critical: { cls: 'is-neg', icon: 'error' },
  warning: { cls: 'is-warn', icon: 'warning' },
  good: { cls: 'is-pos', icon: 'check_circle' },
  info: { cls: '', icon: 'info' },
}

const CONFIDENCE_LABEL: Record<InsightsConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

/** The stored payload arrives from the API, not from the parser, so absent
 *  optional numbers come back as JSON `null` rather than `undefined` — and
 *  `null` is not `undefined`, which rendered a bare "₹0 a year" under every
 *  finding that carried no impact figure. */
function hasImpact(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
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
 * Reading order is deliberate and non-overlapping: the one-line verdict, the
 * ratios that support it, what to decide about (findings), what's simply
 * true of the behaviour (patterns), what's coming (projection), the charts,
 * then what the data can't settle. Each section answers a different
 * question — MASTER.md §8's "no two views answer the same question" applies
 * to LLM prose as much as to charts.
 */
export function InsightsRunView({
  run,
  isDark,
  onRegenerate,
  onDiscard,
  isDiscarding,
}: InsightsRunViewProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const { payload } = run

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

      <div className="card card-flush">
        <ul className="alerts">
          {payload.findings.map((f) => {
            const meta = SEVERITY_META[f.severity]
            return (
              <li key={f.id} className={`alert ${meta.cls}`}>
                <span className="ico">
                  <Icon name={meta.icon} size={16} aria-hidden="true" />
                </span>
                <span className="body">
                  <span className="block font-medium text-[var(--ink)]">{f.title}</span>
                  <span className="block text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                    {f.detail}
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                    {f.so_what}
                  </span>
                  {f.action && (
                    <span className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                      <Icon
                        name="arrow_forward"
                        size={13}
                        aria-hidden="true"
                        style={{ marginTop: 2, flexShrink: 0, color: 'var(--accent)' }}
                      />
                      <span>{f.action}</span>
                    </span>
                  )}
                  {(f.figure || hasImpact(f.annual_impact) || f.confidence) && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ink-3)]">
                      {f.figure && (
                        <span className="num font-medium text-[var(--ink-2)]">
                          {f.figure.label}: {formatInsightsValue(f.figure.value, f.figure.unit)}
                        </span>
                      )}
                      {hasImpact(f.annual_impact) && (
                        <span className="num">
                          {formatInsightsValue(f.annual_impact, 'INR')} a year
                        </span>
                      )}
                      {f.confidence && <span>{CONFIDENCE_LABEL[f.confidence]}</span>}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
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
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
            {payload.projection.basis}
          </p>
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
