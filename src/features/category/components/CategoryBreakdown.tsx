import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'

import type { BreakdownRow } from '../lib/categoryStats'

interface CategoryBreakdownProps {
  merchants: BreakdownRow[]
  tags: BreakdownRow[]
  isLoading: boolean
}

function BarList({ rows, emptyLabel }: { rows: BreakdownRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="p-4 text-[12.5px] text-[var(--ink-3)]">{emptyLabel}</p>
  }
  const max = rows[0]?.total || 1
  return (
    <div className="bars">
      {rows.map((row) => (
        <div key={row.name} className="bar-row">
          <span className="name" title={row.name}>
            {row.name}
          </span>
          <span className="track">
            <span
              className="fill"
              style={{ width: `${Math.min(100, (row.total / max) * 100)}%` }}
            />
          </span>
          <span className="amt num">{formatCurrency(row.total)}</span>
          <span className="of">
            {row.count} charge{row.count === 1 ? '' : 's'}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * "Where in {category}" — merchants and tags inside this category, this
 * month. Two `.bars` lists (Phase 1 primitive), salvaged from
 * `CategoryDeepDive.tsx`'s merchant ranking.
 */
export function CategoryBreakdown({ merchants, tags, isLoading }: CategoryBreakdownProps) {
  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Where in this category</h2>
        <span className="sub">Merchants and tags inside this category, this month</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card card-flush">
          <div className="card-head px-4 pt-4">
            <span className="font-medium text-[var(--ink)]">Merchants</span>
          </div>
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : merchants.length === 0 ? (
            <EmptyState icon="search" title="No merchants this month" />
          ) : (
            <BarList rows={merchants.slice(0, 8)} emptyLabel="No merchants this month" />
          )}
        </div>
        <div className="card card-flush">
          <div className="card-head px-4 pt-4">
            <span className="font-medium text-[var(--ink)]">Tags</span>
          </div>
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : tags.length === 0 ? (
            <EmptyState icon="tag" title="No tagged transactions this month" />
          ) : (
            <BarList rows={tags.slice(0, 8)} emptyLabel="No tagged transactions this month" />
          )}
        </div>
      </div>
    </section>
  )
}
