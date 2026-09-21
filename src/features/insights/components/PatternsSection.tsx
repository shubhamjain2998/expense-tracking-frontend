import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'

import type { InsightsPattern } from '../lib/insightsResponseSchema'

interface PatternsSectionProps {
  patterns: InsightsPattern[]
}

/**
 * Behavioural regularities — timing, trigger, sequence — that no per-category
 * total shows. These need no decision, which is what separates them from
 * findings and keeps the two lists from saying the same thing twice.
 *
 * Collapsed to titles: a pattern is a statement, and the numbers behind it
 * only matter once you've decided the statement is interesting.
 */
export function PatternsSection({ patterns }: PatternsSectionProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (patterns.length === 0) return null

  return (
    <div className="card card-flush">
      <div className="px-4 pt-4 pb-3">
        <p className="card-title flex items-center gap-1.5">
          <Icon name="lightbulb" size={14} />
          Patterns behind the numbers
        </p>
      </div>
      {patterns.map((p) => {
        const isOpen = openId === p.id
        const bodyId = `pattern-body-${p.id}`
        return (
          <div key={p.id} className={`disc ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="disc-head"
              onClick={() => setOpenId(isOpen ? null : p.id)}
              aria-expanded={isOpen}
              aria-controls={bodyId}
            >
              <span className="ico" aria-hidden="true" />
              <span className="t">{p.title}</span>
              <span className="meta">
                <Icon name="expand_more" size={16} className="chev" aria-hidden="true" />
              </span>
            </button>
            {isOpen && (
              <div className="disc-body" id={bodyId} role="region" aria-label={p.title}>
                <p className="lede">{p.detail}</p>
                {p.evidence && <p className="num text-[12px]">{p.evidence}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
