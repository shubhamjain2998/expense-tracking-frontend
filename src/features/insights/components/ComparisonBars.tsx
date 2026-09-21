import { formatInsightsValue } from '../lib/insightsFormat'
import type { InsightsComparison } from '../lib/insightsResponseSchema'

interface ComparisonBarsProps {
  comparison: InsightsComparison
}

/**
 * The before/after pair a finding is about, drawn instead of described. The
 * LLM gives `from` and `to`; the app scales the bars and computes the change,
 * so the sentence above doesn't have to carry either number.
 */
export function ComparisonBars({ comparison }: ComparisonBarsProps) {
  const { from, to, unit, label } = comparison
  const max = Math.max(Math.abs(from), Math.abs(to))
  const width = (v: number) => (max === 0 ? 0 : (Math.abs(v) / max) * 100)

  // The percentage is already on the row's header chip — printing it again
  // here would be the same number in two places on one screen.
  return (
    <div className="cmp" aria-label={label}>
      <span className="eyebrow">{label}</span>
      <div className="cmp-row">
        <span>Before</span>
        <span className="track">
          <span className="fill" style={{ width: `${width(from)}%` }} />
        </span>
        <span className="v">{formatInsightsValue(from, unit)}</span>
      </div>
      <div className="cmp-row now">
        <span>Now</span>
        <span className="track">
          <span className="fill" style={{ width: `${width(to)}%` }} />
        </span>
        <span className="v">{formatInsightsValue(to, unit)}</span>
      </div>
    </div>
  )
}
