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
  info: 'bg-[var(--blue,var(--ink-3))]',
  good: 'bg-[var(--pos)]',
}

export function NeedsAttention({ insights, isLoading }: NeedsAttentionProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="card text-[13px] text-[var(--ink-3)]">
        Nothing needs your attention right now.
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="flex items-center gap-3 rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
        >
          <span
            className={`h-[9px] w-[9px] shrink-0 rounded-full ${DOT[insight.severity]}`}
            aria-hidden
          />
          <span className="flex-1 text-[14px] text-[var(--ink-2)]">
            {renderParts(insight.text)}
          </span>
          {insight.action && (
            <Link
              to={insight.action.href}
              className="shrink-0 text-[12.5px] whitespace-nowrap text-[var(--ink-3)] no-underline hover:text-[var(--ink)]"
            >
              {insight.action.label} →
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
