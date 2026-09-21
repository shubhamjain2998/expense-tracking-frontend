import { Icon } from '@/components/ui/Icon'

import type { InsightsPattern } from '../lib/insightsResponseSchema'

interface PatternsSectionProps {
  patterns: InsightsPattern[]
}

/**
 * Behavioural regularities — timing, trigger, sequence — that no per-category
 * total shows. These need no decision, which is exactly what separates them
 * from findings and keeps the two lists from saying the same thing twice.
 */
export function PatternsSection({ patterns }: PatternsSectionProps) {
  if (patterns.length === 0) return null

  return (
    <div className="card card-flush">
      <div className="px-4 pt-4">
        <p className="card-title flex items-center gap-1.5">
          <Icon name="lightbulb" size={14} />
          Patterns behind the numbers
        </p>
      </div>
      <ul className="alerts mt-3">
        {patterns.map((p) => (
          <li key={p.id} className="alert">
            <span className="body">
              <span className="block font-medium text-[var(--ink)]">{p.title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                {p.detail}
              </span>
              {p.evidence && (
                <span className="num mt-1 block text-[12px] text-[var(--ink-3)]">{p.evidence}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
