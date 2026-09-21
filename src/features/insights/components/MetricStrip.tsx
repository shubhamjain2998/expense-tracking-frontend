import { useState } from 'react'

import { Icon, type IconName } from '@/components/ui/Icon'

import { formatInsightsValue } from '../lib/insightsFormat'
import type { InsightsDirection, InsightsMetric, InsightsTone } from '../lib/insightsResponseSchema'

interface MetricStripProps {
  metrics: InsightsMetric[]
}

const DIRECTION_ICON: Record<InsightsDirection, IconName> = {
  up: 'trending_up',
  down: 'trending_down',
  flat: 'remove',
}

/** Tone, not direction, decides colour: "committed share up" is bad news and
 *  "savings rate up" is good, and only the LLM knows which it meant. */
const TONE_COLOR: Record<InsightsTone, string> = {
  positive: 'var(--pos)',
  negative: 'var(--neg)',
  neutral: 'var(--ink-3)',
}

/**
 * The derived-ratio strip: numbers the app never computes for itself
 * (savings rate, committed share of income, spend concentration). The number
 * is the point, so it leads; the LLM's reading of it is clamped to two lines
 * and opens in place when there is more.
 */
export function MetricStrip({ metrics }: MetricStripProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (metrics.length === 0) return null

  return (
    <div className="card card-flush">
      <div className="stats stats-read">
        {metrics.map((m) => {
          const color = m.tone ? TONE_COLOR[m.tone] : undefined
          const isOpen = expanded === m.id
          return (
            <div key={m.id}>
              <span className="eyebrow">{m.label}</span>
              <span
                className="v num flex items-center gap-1.5"
                style={color ? { color } : undefined}
              >
                {formatInsightsValue(m.value, m.unit)}
                {m.direction && (
                  <Icon name={DIRECTION_ICON[m.direction]} size={15} aria-hidden="true" />
                )}
              </span>
              <button
                type="button"
                className="metric-read"
                onClick={() => setExpanded(isOpen ? null : m.id)}
                aria-expanded={isOpen}
              >
                <span className={isOpen ? undefined : 'clamp-2'}>{m.detail}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
