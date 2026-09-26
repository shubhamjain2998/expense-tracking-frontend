import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'
import type { SummaryRow } from '@/types/dashboard'

type SortMode = 'amount' | 'over'

interface WhereItWentProps {
  summaryRows: SummaryRow[]
  budgetRows: SummaryRow[]
  /** Fraction of the month elapsed, 0–1 — position of the pace tick. */
  paceAt: number
  /** The period year/month currently selected on Home (searchParams
   *  convention, not calendar) — carried into the row link so the category
   *  drill-down opens on the same month the user was looking at instead of
   *  defaulting to today's (possibly empty) month. */
  year: number
  month: number
  isLoading: boolean
  /** Category lit up elsewhere (the 3D towers on Home); its row shows as hovered. */
  highlight?: string | null
  /** Reports the row under the pointer or keyboard focus, null when it leaves. */
  onHighlight?: (category: string | null) => void
}

interface Row {
  category: string
  actual: number
  allocated: number
  over: boolean
}

function toRow(r: SummaryRow): Row {
  const actual = Math.max(0, Number(r.actual))
  const allocated = Math.max(0, Number(r.allocated_monthly))
  return { category: r.category, actual, allocated, over: allocated > 0 && actual > allocated }
}

/**
 * Block 2 — Where it went. "What did it go on, and is any of it running hot?"
 * The bar list doubles as the budget-pace view: the pace marker is a tick on
 * the same bar, not a second chart. Replaces the donut, BudgetPaceBars,
 * CategoryDeepDive and CategoryTransactionStats — the row's link target IS
 * the deep dive now (/c/:categoryId).
 */
export function WhereItWent({
  summaryRows,
  budgetRows,
  paceAt,
  year,
  month,
  isLoading,
  highlight = null,
  onHighlight,
}: WhereItWentProps) {
  const [sort, setSort] = useState<SortMode>('amount')

  // Amount mode: every category with spend, largest first — the old
  // categoryChartData shaping, re-derived locally per the phase's
  // constraint against touching data.categoryChartData / lib/.
  const amountRows = useMemo<Row[]>(
    () =>
      summaryRows
        .filter((r) => Number(r.actual) > 0)
        .map(toRow)
        .sort((a, b) => b.actual - a.actual),
    [summaryRows]
  )

  // Over-budget mode: budgetRows already arrives sorted by pct-of-budget
  // desc (categories with no budget sort last, at ratio 0).
  const overRows = useMemo<Row[]>(() => budgetRows.map(toRow), [budgetRows])

  const rows = sort === 'amount' ? amountRows : overRows
  const maxActual = rows.reduce((m, r) => Math.max(m, r.actual), 0) || 1

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Where it went</h2>
        <span className="sub">
          {rows.length} {rows.length === 1 ? 'category' : 'categories'} · tick marks today&rsquo;s
          expected spend
        </span>
        <span className="act">
          <span className="seg">
            <button
              type="button"
              className={sort === 'amount' ? 'on' : ''}
              aria-pressed={sort === 'amount'}
              onClick={() => setSort('amount')}
            >
              Amount
            </button>
            <button
              type="button"
              className={sort === 'over' ? 'on' : ''}
              aria-pressed={sort === 'over'}
              onClick={() => setSort('over')}
            >
              Over budget
            </button>
          </span>
        </span>
      </div>

      <div className="card card-flush">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-56 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="bar_chart"
            title="No spend yet"
            description="Import a statement to see where it went this month."
          />
        ) : (
          <div className="bars">
            {rows.map((row) => (
              <Link
                key={row.category}
                className={['bar-row', highlight === row.category ? 'is-hot' : null]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => onHighlight?.(row.category)}
                onMouseLeave={() => onHighlight?.(null)}
                onFocus={() => onHighlight?.(row.category)}
                onBlur={() => onHighlight?.(null)}
                to={`/c/${encodeURIComponent(row.category)}?year=${year}&month=${month}`}
              >
                <span className="name">{row.category}</span>
                <span className="track">
                  <span
                    className={['fill', row.over ? 'over' : null].filter(Boolean).join(' ')}
                    style={{ width: `${Math.min(100, (row.actual / maxActual) * 100)}%` }}
                  />
                  {row.allocated > 0 && (
                    <span
                      className="tick"
                      // Same scale as the fill: the tick marks where THIS
                      // row's expected-by-today spend sits on the shared
                      // largest-category axis, not a percentage of the
                      // row's own budget (that would put every tick near
                      // the right edge regardless of budget size).
                      style={{
                        left: `${Math.min(100, ((row.allocated * paceAt) / maxActual) * 100)}%`,
                      }}
                      data-label="expected today"
                      // The label is a visual hover hint; read aloud it put
                      // "expected today" before the row's actual spend.
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className={['amt', 'num', row.over ? 'neg' : null].filter(Boolean).join(' ')}>
                  {formatCurrency(row.actual)}
                </span>
                <span className="of">
                  {row.allocated > 0
                    ? `${Math.round((row.actual / row.allocated) * 100)}% of ${formatCurrency(row.allocated)}`
                    : 'no budget'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
