import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'

import type { StakeRow } from '../lib/insightsDerive'

interface ImpactBarsProps {
  rows: StakeRow[]
  onSelect: (id: string) => void
  /** Finding lit in both these bars and the 3D world's slabs. */
  highlight?: string | null
  onHighlight?: (id: string | null) => void
}

/**
 * "What's at stake" — every finding that carries a yearly figure, ranked by
 * it. This is the page's first answer to "where do I look", so it sits above
 * the findings list and each bar opens the finding it came from.
 *
 * Reuses the `.bars` primitive from Home's "Where it went" (see
 * MASTER.md §6) rather than inventing a second bar list; only the column
 * template differs.
 */
export function ImpactBars({ rows, onSelect, highlight = null, onHighlight }: ImpactBarsProps) {
  if (rows.length < 2) return null

  return (
    <div className="card card-flush">
      <div className="px-4 pt-4">
        <p className="card-title">What's at stake, per year</p>
        <p className="mt-1 text-[12.5px] text-[var(--ink-3)]">
          Each finding sized by what it is worth over twelve months. Pick one to read it.
        </p>
      </div>
      <div className="bars stake mt-3">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            className={['bar-row', highlight === r.id ? 'is-hot' : null].filter(Boolean).join(' ')}
            onClick={() => onSelect(r.id)}
            onMouseEnter={() => onHighlight?.(r.id)}
            onMouseLeave={() => onHighlight?.(null)}
            onFocus={() => onHighlight?.(r.id)}
            onBlur={() => onHighlight?.(null)}
            aria-label={`${r.title}: ${formatCurrency(r.amount)} a year`}
          >
            <span className="name">{r.title}</span>
            <span className="track">
              <span className="fill" style={{ width: `${Math.max(2, r.ratio * 100)}%` }} />
            </span>
            <span className="num flex items-center justify-end gap-1 text-[12.5px] font-medium text-[var(--ink-2)]">
              {formatCurrency(r.amount)}
              <Icon name="chevron_right" size={13} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
