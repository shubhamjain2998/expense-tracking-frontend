import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'

import type { HeatmapRow } from '../lib/heatmap'

interface HeatmapSectionProps {
  rows: HeatmapRow[]
  isLoading: boolean
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Insights §3 — When it happens. The only "when × what" view in the app.
 * Shade is relative to each row's OWN peak (h1..h5, `.heat` primitive from
 * Phase 1); over-budget is a red inset ring, never a red fill — a red fill
 * made the whole grid unreadable in testing (see MASTER.md guidance this
 * phase was briefed with). Reuses the `.heat` CSS from Phase 1 as-is; the
 * cell maths are local (`../lib/heatmap.ts`), reading — not editing —
 * `src/features/budget/components/HeatmapCard.tsx` for the budget
 * override/base resolution rule.
 */
export function HeatmapSection({ rows, isLoading }: HeatmapSectionProps) {
  const monthLabels = rows[0]?.cells.map((c) => c.label) ?? []

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">When it happens</h2>
        <span className="sub">
          Shade is relative to each row&rsquo;s own peak · a red outline means over that
          month&rsquo;s budget
        </span>
      </div>

      <div className="card">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState icon="bar_chart" title="No spend yet" description="Nothing to map yet." />
        ) : (
          <>
            <div className="heat">
              <span />
              {monthLabels.map((label, i) => (
                <span key={i} className="colhead">
                  {label}
                </span>
              ))}
              {rows.map((row) => (
                <div key={row.category} style={{ display: 'contents' }}>
                  <span className="lab" title={row.category}>
                    {row.category}
                  </span>
                  {row.cells.map((cell) => {
                    if (cell.bucket === null) {
                      return (
                        <span
                          key={`${row.category}-${cell.year}-${cell.month}`}
                          className="cell"
                          title={`${cell.label} — not yet`}
                        />
                      )
                    }
                    const title = `${row.category} · ${MONTH_NAMES[cell.month - 1]} ${cell.year} · ${formatCurrency(cell.value)}${cell.over ? ' · over budget' : ''}`
                    return (
                      <span
                        key={`${row.category}-${cell.year}-${cell.month}`}
                        className={['cell', `h${cell.bucket}`, cell.over ? 'over' : null]
                          .filter(Boolean)
                          .join(' ')}
                        title={title}
                      >
                        {Math.round(cell.value / 1000)}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="legendrow">
              <span>Quiet</span>
              <span className="heat-key">
                <span style={{ background: 'var(--surface-2)' }} />
                <span className="h1" />
                <span className="h2" />
                <span className="h3" />
                <span className="h4" />
                <span className="h5" />
              </span>
              <span>Peak</span>
              <span style={{ marginLeft: 16 }}>
                <span className="heat-key" style={{ verticalAlign: 'middle' }}>
                  <span className="h2 over" style={{ boxShadow: 'inset 0 0 0 2px var(--neg)' }} />
                </span>{' '}
                over budget
              </span>
              <span style={{ marginLeft: 'auto' }}>Hover a cell for the exact figure</span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
