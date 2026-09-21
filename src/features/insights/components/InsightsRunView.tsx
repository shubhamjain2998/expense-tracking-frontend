import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { InsightsRunOut } from '@/lib/api/insights'

import type { InsightsSeverity } from '../lib/insightsResponseSchema'

import { InsightsChartCard } from './InsightsChartCard'

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
                  <span className="block text-[12.5px] text-[var(--ink-3)]">{f.detail}</span>
                  {f.figure && (
                    <span className="num mt-1 block text-[12.5px] font-medium text-[var(--ink-2)]">
                      {f.figure.label}: {f.figure.value}
                      {f.figure.unit ? ` ${f.figure.unit}` : ''}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {payload.charts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {payload.charts.map((chart) => (
            <InsightsChartCard key={chart.id} chart={chart} isDark={isDark} />
          ))}
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
