import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'

import type { RecurringCommitment, RecurringResult } from '../lib/contracts'

interface CommittedVsChosenProps {
  recurring: RecurringResult
  totalDebit: number
  now: Date
  isLoading: boolean
}

const DAY_MS = 86_400_000
const WINDOW_DAYS = 14

function daysUntil(iso: string, now: Date): number {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return (d.getTime() - now.getTime()) / DAY_MS
}

function formatNextExpected(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

/**
 * Block 3 — Committed vs chosen. "How much of this was even my decision?"
 * Source: detectRecurring(allHistory, now) — keeps the MEDIAN monthly rule
 * and the tag-key bypass untouched (lib/recurring.ts is not edited here).
 * "Chosen" = totalDebit − committed, so this block owns that split; it does
 * not restate totalDebit itself (that lives in block 1).
 */
export function CommittedVsChosen({
  recurring,
  totalDebit,
  now,
  isLoading,
}: CommittedVsChosenProps) {
  const committed = recurring.lockedInPerMonth
  const chosen = Math.max(0, totalDebit - committed)
  const spendTotal = committed + chosen
  const committedPct = spendTotal > 0 ? Math.round((committed / spendTotal) * 100) : 0
  const chosenPct = spendTotal > 0 ? 100 - committedPct : 0

  const upcoming: RecurringCommitment[] = recurring.commitments
    .filter((c) => {
      const days = daysUntil(c.nextExpected, now)
      return days >= -1 && days <= WINDOW_DAYS
    })
    .sort((a, b) => a.nextExpected.localeCompare(b.nextExpected))
    .slice(0, 6)
  const upcomingTotal = upcoming.reduce((s, c) => s + c.medianAmount, 0)

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Committed vs chosen</h2>
        <span className="sub">What repeats every month, and what you decided this month</span>
        <span className="act">
          <Link className="btn sm" to="/insights">
            All commitments
          </Link>
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card flex flex-col gap-4">
            <div className="flex flex-wrap gap-8">
              <span className="money">
                <span className="eyebrow">Committed</span>
                <span className="v">{formatCurrency(committed)}</span>
                <span className="text-[12.5px] text-[var(--ink-3)]">
                  {committedPct}% of spend · {recurring.commitments.length} charge
                  {recurring.commitments.length === 1 ? '' : 's'}
                </span>
              </span>
              <span className="money">
                <span className="eyebrow">Chosen</span>
                <span className="v">{formatCurrency(chosen)}</span>
                <span className="text-[12.5px] text-[var(--ink-3)]">{chosenPct}% of spend</span>
              </span>
            </div>
            <div>
              <div className="meter">
                <i style={{ width: `${committedPct}%` }} />
              </div>
              <p className="mt-1.5 text-[12.5px] text-[var(--ink-3)]">
                {Math.round(recurring.pctOfAvgMonth * 100)}% of an average month is locked in — the
                rest is this month&rsquo;s choice.
              </p>
            </div>
          </div>

          <div className="card card-flush">
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
              <Icon name="refresh" size={15} className="text-[var(--ink-3)]" />
              <span className="font-medium text-[var(--ink)]">Next 14 days</span>
              {upcoming.length > 0 && (
                <span className="num ml-auto text-[12.5px] text-[var(--ink-3)]">
                  {formatCurrency(upcomingTotal)} due
                </span>
              )}
            </div>
            {upcoming.length === 0 ? (
              <EmptyState
                icon="calendar_today"
                title="Nothing due soon"
                description="No recurring charges expected in the next 14 days."
              />
            ) : (
              <div className="alerts">
                {upcoming.map((c) => (
                  <div
                    key={c.key}
                    className={['alert', c.flags.includes('changed') ? 'is-warn' : null]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Icon
                      className="ico"
                      name={c.flags.includes('changed') ? 'trending_up' : 'calendar_today'}
                      size={16}
                    />
                    <span className="body flex flex-col">
                      <span className="font-medium text-[var(--ink)]">{c.name}</span>
                      <span className="text-[12.5px] text-[var(--ink-3)]">
                        {formatNextExpected(c.nextExpected)} · {c.cadence}
                      </span>
                    </span>
                    <span className="act num">{formatCurrency(c.medianAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
