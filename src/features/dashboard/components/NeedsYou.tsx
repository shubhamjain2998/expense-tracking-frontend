import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { formatCompact } from '@/lib/format'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import type { SplitLedgerRow } from '@/types/dashboard'
import type { PendingManualTransaction } from '@/types/transaction'

import type { Insight, Severity } from '../lib/contracts'

import { renderParts } from './textParts'

interface NeedsYouProps {
  insights: Insight[]
  pendingItems: PendingManualTransaction[]
  ledger: SplitLedgerRow[]
  isLoading: boolean
}

interface Row {
  id: string
  severity: Severity
  icon: IconName
  body: ReactNode
  action?: { label: string; href: string }
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warn: 1, info: 2, good: 3 }
const SEVERITY_CLASS: Record<Severity, string> = {
  critical: 'is-neg',
  warn: 'is-warn',
  info: '',
  good: 'is-pos',
}

function iconForInsight(id: string, severity: Severity): IconName {
  if (id.startsWith('budget-blowout')) return 'trending_up'
  if (id.startsWith('recurring-due')) return 'calendar_today'
  if (id.startsWith('recurring-missing')) return 'info'
  if (id === 'seasonality-down') return 'trending_down'
  if (id === 'seasonality-peak') return 'calendar_today'
  if (id === 'savings-above-avg') return 'check_circle'
  if (id.startsWith('big-share')) return 'info'
  if (severity === 'good') return 'check_circle'
  if (severity === 'info') return 'info'
  return 'warning'
}

function daysOld(dateStr: string, now: Date): number {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000))
}

/**
 * Block 5 — Needs you. "What is waiting on me?"
 * A flat list of at most 6 rows, never collapsed by default. Absorbs
 * NeedsAttention (computeInsights().insights), NeedsReview (pendingItems)
 * and the summary line of SplitLedger (ledger) — the split-owed total is
 * only ever built once (from ledger, with the per-person breakdown), not
 * repeated via the engine's own split-owed insight.
 */
export function NeedsYou({ insights, pendingItems, ledger, isLoading }: NeedsYouProps) {
  const { mode } = usePeriodMode()
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []

    if (pendingItems.length > 0) {
      const sum = pendingItems.reduce((s, i) => s + Math.abs(Number(i.amount)), 0)
      const oldest = pendingItems.reduce((max, i) => Math.max(max, daysOld(i.txn_date, now)), 0)
      out.push({
        id: 'pending-review',
        severity: 'warn',
        icon: 'warning',
        body: (
          <>
            <span className="font-medium text-[var(--ink)]">
              {pendingItems.length} transaction{pendingItems.length === 1 ? ' is' : 's are'} still
              uncategorised
            </span>
            <span className="block text-[12.5px] text-[var(--ink-3)]">
              {formatCompact(sum)} · oldest is {oldest} day{oldest === 1 ? '' : 's'} old
            </span>
          </>
        ),
        action: { label: 'Review', href: pendingTransactionsUrl(pendingItems, mode) },
      })
    }

    for (const insight of insights) {
      // Superseded below by the richer, per-person ledger row — the same
      // owed total must not appear twice on the page.
      if (insight.id === 'split-owed') continue
      const category = insight.id.startsWith('budget-blowout-')
        ? insight.id.slice('budget-blowout-'.length)
        : null
      out.push({
        id: insight.id,
        severity: insight.severity,
        icon: iconForInsight(insight.id, insight.severity),
        body: <span className="text-[var(--ink-2)]">{renderParts(insight.text)}</span>,
        action: category
          ? { label: 'Open', href: `/c/${encodeURIComponent(category)}` }
          : insight.action,
      })
    }

    let owedTotal = 0
    const breakdown: string[] = []
    for (const row of ledger) {
      const amt = Number(row.total_split_amount)
      if (Number.isFinite(amt) && amt > 0) {
        owedTotal += amt
        breakdown.push(`${row.person_name} ${formatCompact(amt)}`)
      }
    }
    if (owedTotal > 0) {
      out.push({
        id: 'splits-owed',
        severity: 'info',
        icon: 'group',
        body: (
          <>
            <span className="font-medium text-[var(--ink)]">
              {formatCompact(owedTotal)} owed to you across {breakdown.length} split
              {breakdown.length === 1 ? '' : 's'}
            </span>
            <span className="block text-[12.5px] text-[var(--ink-3)]">{breakdown.join(' · ')}</span>
          </>
        ),
        action: { label: 'Settle', href: '/insights' },
      })
    }

    out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    return out.slice(0, 6)
  }, [insights, pendingItems, ledger, mode, now])

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Needs you</h2>
        <span className="sub">
          {rows.length} open item{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="card card-flush">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="upload_file"
            title="Nothing waiting on you"
            description="Import a statement to bring in your latest transactions."
            action={{ label: 'Import a statement', onClick: () => navigate('/upload') }}
          />
        ) : (
          <div className="alerts">
            {rows.map((row) => {
              const modClass = SEVERITY_CLASS[row.severity]
              return (
                <div key={row.id} className={`alert${modClass ? ` ${modClass}` : ''}`}>
                  <Icon className="ico" name={row.icon} size={18} />
                  <span className="body">{row.body}</span>
                  {row.action && (
                    <Link className="btn sm act" to={row.action.href}>
                      {row.action.label}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="mt-3 text-[12.5px] text-[var(--ink-3)]">
        Habits, seasonality, day-of-week patterns and the year-to-date picture live in{' '}
        <Link to="/insights">Insights</Link> — they don&rsquo;t change what you do today.
      </p>
    </section>
  )
}
