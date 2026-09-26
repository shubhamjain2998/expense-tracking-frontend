import { Icon, type IconName } from '@/components/ui/Icon'

import { formatChange, hasImpact } from '../lib/insightsDerive'
import { formatInsightsValue } from '../lib/insightsFormat'
import type {
  InsightsConfidence,
  InsightsFinding,
  InsightsSeverity,
} from '../lib/insightsResponseSchema'

import { ComparisonBars } from './ComparisonBars'

interface FindingRowProps {
  finding: InsightsFinding
  isOpen: boolean
  onToggle: () => void
  /** Lit from the 3D world's slab for this finding. */
  isHot?: boolean
  /** Pointer or focus entering (true) and leaving (false) the row's head. */
  onHover?: (on: boolean) => void
}

const SEVERITY_META: Record<InsightsSeverity, { cls: string; icon: IconName }> = {
  critical: { cls: 'is-neg', icon: 'error' },
  warning: { cls: 'is-warn', icon: 'warning' },
  good: { cls: 'is-pos', icon: 'check_circle' },
  info: { cls: '', icon: 'info' },
}

const CONFIDENCE_LABEL: Record<InsightsConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

/** A rise in what you spend is bad news and a rise in what you keep is good;
 *  severity is the only thing on a finding that says which this is. */
function deltaTone(severity: InsightsSeverity): string {
  if (severity === 'good') return 'pos'
  if (severity === 'critical' || severity === 'warning') return 'neg'
  return ''
}

/**
 * One finding, collapsed to its headline. Visible without a click: severity,
 * title, how much it moved, and what it is worth per year. The reasoning —
 * detail, consequence, action, evidence — opens underneath on demand.
 *
 * Nothing the LLM sent is dropped; it is ordered by how much of it a person
 * needs at a glance.
 */
export function FindingRow({
  finding: f,
  isOpen,
  onToggle,
  isHot = false,
  onHover,
}: FindingRowProps) {
  const meta = SEVERITY_META[f.severity]
  const change = f.comparison ? formatChange(f.comparison.from, f.comparison.to) : null
  const bodyId = `finding-body-${f.id}`

  return (
    <div className={`disc ${meta.cls} ${isOpen ? 'is-open' : ''} ${isHot ? 'is-hot' : ''}`}>
      <button
        type="button"
        className="disc-head"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onMouseEnter={onHover && (() => onHover(true))}
        onMouseLeave={onHover && (() => onHover(false))}
        onFocus={onHover && (() => onHover(true))}
        onBlur={onHover && (() => onHover(false))}
      >
        <span className="ico">
          <Icon name={meta.icon} size={16} aria-hidden="true" />
        </span>
        <span className="t">{f.title}</span>
        <span className="meta">
          {change && <span className={`chip ${deltaTone(f.severity)} num`}>{change}</span>}
          {hasImpact(f.annual_impact) && (
            <span className="num hidden text-[12.5px] font-medium text-[var(--ink-2)] sm:inline">
              {formatInsightsValue(f.annual_impact, 'INR')}/yr
            </span>
          )}
          <Icon name="expand_more" size={16} className="chev" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className="disc-body" id={bodyId} role="region" aria-label={f.title}>
          <p>{f.detail}</p>
          <p className="lede">{f.so_what}</p>
          {f.comparison && <ComparisonBars comparison={f.comparison} />}
          {f.action && (
            <p className="flex items-start gap-1.5 text-[var(--ink-2)]">
              <Icon
                name="arrow_forward"
                size={13}
                aria-hidden="true"
                style={{ marginTop: 3, flexShrink: 0, color: 'var(--accent)' }}
              />
              <span>{f.action}</span>
            </p>
          )}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            {f.figure && (
              <span className="num font-medium text-[var(--ink-2)]">
                {f.figure.label}: {formatInsightsValue(f.figure.value, f.figure.unit)}
              </span>
            )}
            {hasImpact(f.annual_impact) && (
              <span className="num sm:hidden">
                {formatInsightsValue(f.annual_impact, 'INR')} a year
              </span>
            )}
            {f.confidence && <span>{CONFIDENCE_LABEL[f.confidence]}</span>}
          </p>
        </div>
      )}
    </div>
  )
}
