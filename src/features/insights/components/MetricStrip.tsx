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
 * (savings rate, committed share of income, spend concentration), each with
 * the LLM's one-line reading of it. Distinct from the findings list below —
 * a metric is a measurement, a finding is something to decide about.
 */
export function MetricStrip({ metrics }: MetricStripProps) {
  if (metrics.length === 0) return null

  return (
    <div className="card card-flush">
      <div className="stats stats-read">
        {metrics.map((m) => {
          const color = m.tone ? TONE_COLOR[m.tone] : undefined
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
              <span className="text-[12.5px] leading-relaxed text-[var(--ink-3)]">{m.detail}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
