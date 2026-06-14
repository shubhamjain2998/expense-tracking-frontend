import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Skeleton } from '@/components/ui/Skeleton'

import type { Insight, Severity } from '../lib/contracts'

import { renderParts } from './textParts'

interface NeedsAttentionProps {
  insights: Insight[]
  isLoading: boolean
}

const DOT: Record<Severity, string> = {
  critical: 'bg-[var(--accent)]',
  warn: 'bg-[var(--warn)]',
  info: 'bg-[var(--ink-3)]',
  good: 'bg-[var(--pos)]',
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warn: 1, info: 2, good: 3 }

export function NeedsAttention({ insights, isLoading }: NeedsAttentionProps) {
  // Collapsed by default so the month's numbers are visible immediately on load;
  // the verdict headline already surfaces the single most important driver.
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return <Skeleton className="h-12 w-full" />
  }
  if (insights.length === 0) {
    return null
  }

  const topSeverity = insights.reduce<Severity>(
    (s, i) => (SEVERITY_RANK[i.severity] < SEVERITY_RANK[s] ? i.severity : s),
    'good'
  )
  const actionable = insights.filter(
    (i) => i.severity === 'critical' || i.severity === 'warn'
  ).length

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`h-[9px] w-[9px] shrink-0 rounded-full ${DOT[topSeverity]}`} aria-hidden />
        <span className="text-[14px] font-medium text-[var(--ink)]">Needs attention</span>
        <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--ink-2)]">
          {insights.length}
        </span>
        {actionable > 0 && (
          <span className="text-[12.5px] text-[var(--ink-3)]">
            {actionable} need{actionable === 1 ? 's' : ''} action
          </span>
        )}
        <span className="flex-1" />
        <span
          className={
            open
              ? 'rotate-180 text-[12px] text-[var(--ink-3)] transition-transform'
              : 'text-[12px] text-[var(--ink-3)] transition-transform'
          }
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {insights.map((insight) => (
            <div key={insight.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={`h-[7px] w-[7px] shrink-0 rounded-full ${DOT[insight.severity]}`}
                aria-hidden
              />
              <span className="flex-1 text-[13.5px] text-[var(--ink-2)]">
                {renderParts(insight.text)}
              </span>
              {insight.action && (
                <Link
                  to={insight.action.href}
                  className="shrink-0 text-[12px] whitespace-nowrap text-[var(--ink-3)] no-underline hover:text-[var(--ink)]"
                >
                  {insight.action.label} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
