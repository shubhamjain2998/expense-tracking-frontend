import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'

import type { InsightsPattern } from '../lib/insightsResponseSchema'

interface PatternsSectionProps {
  patterns: InsightsPattern[]
  /** Controlled open row; left out, the section keeps its own. */
  openId?: string | null
  onOpenChange?: (id: string | null) => void
  /** Pattern lit in both this list and the 3D world's plates. */
  highlight?: string | null
  onHighlight?: (id: string | null) => void
}

/**
 * Behavioural regularities — timing, trigger, sequence — that no per-category
 * total shows. These need no decision, which is what separates them from
 * findings and keeps the two lists from saying the same thing twice.
 *
 * Collapsed to titles: a pattern is a statement, and the numbers behind it
 * only matter once you've decided the statement is interesting.
 */
export function PatternsSection({
  patterns,
  openId: controlledOpenId,
  onOpenChange,
  highlight = null,
  onHighlight,
}: PatternsSectionProps) {
  const [ownOpenId, setOwnOpenId] = useState<string | null>(null)
  const openId = controlledOpenId === undefined ? ownOpenId : controlledOpenId
  const setOpenId = onOpenChange ?? setOwnOpenId

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
          <div
            key={p.id}
            className={`disc ${isOpen ? 'is-open' : ''} ${highlight === p.id ? 'is-hot' : ''}`}
          >
            <button
              type="button"
              className="disc-head"
              onClick={() => setOpenId(isOpen ? null : p.id)}
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onMouseEnter={onHighlight && (() => onHighlight(p.id))}
              onMouseLeave={onHighlight && (() => onHighlight(null))}
              onFocus={onHighlight && (() => onHighlight(p.id))}
              onBlur={onHighlight && (() => onHighlight(null))}
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
