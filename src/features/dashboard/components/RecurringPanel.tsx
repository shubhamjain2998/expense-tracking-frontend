import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'

import { PIE_COLORS } from '../lib/chartTheme'
import type { RecurringCommitment, RecurringFlag, RecurringResult } from '../lib/contracts'

interface RecurringPanelProps {
  result: RecurringResult
  isLoading: boolean
}

/** Stable colour per commitment — hash the key into the shared muted palette so a
 *  given charge keeps the same dot colour across renders without needing an index. */
function dotColor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return PIE_COLORS[Math.abs(hash) % PIE_COLORS.length]
}

/** "2026-07-01" → "Jul 1" (locale-stable, no time-zone drift from the ISO slice). */
function formatNextExpected(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

interface FlagStyle {
  label: string
  /** Full Tailwind class string — never spliced, to dodge the prettier-className trap. */
  className: string
}

const FLAG_STYLES: Record<RecurringFlag, FlagStyle> = {
  due: {
    label: 'due soon',
    className:
      'rounded-[4px] bg-[var(--warn-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--warn)]',
  },
  new: {
    label: 'new',
    className:
      'rounded-[4px] bg-[var(--pos-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--pos)]',
  },
  missing: {
    label: 'missing',
    className:
      'rounded-[4px] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--accent)]',
  },
  changed: {
    label: 'changed',
    className:
      'rounded-[4px] bg-[var(--warn-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--warn)]',
  },
}

/** Stable display order so the highest-signal chips (action needed) come first. */
const FLAG_ORDER: RecurringFlag[] = ['due', 'missing', 'changed', 'new']

function RecurringRow({ commitment }: { commitment: RecurringCommitment }) {
  const flags = FLAG_ORDER.filter((f) => commitment.flags.includes(f))
  return (
    <div className="flex items-center gap-3 bg-[var(--surface)] px-[15px] py-3 text-[14px]">
      <div className="flex min-w-0 flex-[1.6] items-center gap-2.5 font-medium text-[var(--ink)]">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: dotColor(commitment.key) }}
        />
        <span className="truncate" title={commitment.name}>
          {commitment.name}
        </span>
        {flags.map((flag) => (
          <span key={flag} className={FLAG_STYLES[flag].className}>
            {FLAG_STYLES[flag].label}
          </span>
        ))}
      </div>

      <span
        className="flex-1 truncate text-[12.5px] text-[var(--ink-3)]"
        title={commitment.category}
      >
        {commitment.cadence} · {commitment.category}
      </span>

      <span className="flex-1 truncate text-[12.5px] text-[var(--ink-3)]">
        next: {formatNextExpected(commitment.nextExpected)}
      </span>

      <span className="shrink-0 text-right">
        <span className="num block font-semibold text-[var(--ink)]">
          {formatCurrency(Math.round(commitment.monthlyAmount))}
          <span className="text-[11px] font-normal text-[var(--ink-3)]">/mo</span>
        </span>
        {Math.round(commitment.monthlyAmount) !== Math.round(commitment.medianAmount) && (
          <span className="num block text-[11px] text-[var(--ink-4)]">
            {formatCurrency(commitment.medianAmount)}/charge
          </span>
        )}
      </span>
    </div>
  )
}

export function RecurringPanel({ result, isLoading }: RecurringPanelProps) {
  const pct = Math.round(result.pctOfAvgMonth * 100)

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="title">Recurring &amp; subscriptions</div>
          <div className="sub">What&rsquo;s on autopilot — stable amount, repeating</div>
        </div>
      </div>

      <section className="card">
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : result.commitments.length === 0 ? (
          <EmptyState
            icon="refresh"
            title="No recurring charges detected yet"
            description="Once a charge repeats with a stable amount across a few months, it shows up here."
          />
        ) : (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-3.5">
              <div className="text-[13px] text-[var(--ink-3)]">Locked in each month</div>
              <div className="num text-[24px] font-semibold text-[var(--ink)]">
                {formatCompact(result.lockedInPerMonth)}
                <span className="ml-1 text-[13px] font-normal text-[var(--ink-3)]">
                  /mo locked in · ≈{pct}% of an average month
                </span>
              </div>
            </div>

            <div className="mt-2 grid gap-px overflow-hidden rounded-[10px] bg-[var(--line)]">
              {result.commitments.map((commitment) => (
                <RecurringRow key={commitment.key} commitment={commitment} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
