import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { ProcessedTransactionItem } from '@/types/transaction'

interface CategoryTransactionsTableProps {
  txns: ProcessedTransactionItem[]
  monthLabel: string
  /** `/transactions?year=&month=&category=` for the same period, in
   *  Transactions' own period-year numbering. */
  openInTransactionsHref: string
  isLoading: boolean
  /** Transaction lit in both the table and the 3D day field. */
  highlight?: string | null
  onHighlight?: (id: string | null) => void
  /** Scroll the rows inside the card instead of growing the page — the 3D
   *  world's panels need to stay about a screen tall. */
  scrollBody?: boolean
}

/**
 * "The transactions" — the category's own transactions for the selected
 * month, table shaping salvaged from `CategoryTransactionStats.tsx`'s
 * per-category rollup idiom (here at transaction grain, not category grain).
 */
export function CategoryTransactionsTable({
  txns,
  monthLabel,
  openInTransactionsHref,
  isLoading,
  highlight = null,
  onHighlight,
  scrollBody = false,
}: CategoryTransactionsTableProps) {
  const sorted = [...txns].sort((a, b) => b.txn_date.localeCompare(a.txn_date))

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">The transactions</h2>
        <span className="sub">
          {sorted.length} in {monthLabel}
        </span>
        <span className="act">
          <Link className="btn sm" to={openInTransactionsHref}>
            Open in Transactions
          </Link>
        </span>
      </div>

      <div className={scrollBody ? 'card card-flush cat-txn-scroll' : 'card card-flush'}>
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon="receipt" title="No transactions this month" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                {/* On a phone the amount would sit past the card's edge behind a
                    sideways scroll; tags and people give way to it. */}
                <th className="max-sm:hidden">Tags</th>
                <th className="max-sm:hidden">With</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr
                  key={t.id}
                  data-txn-id={t.id}
                  className={highlight === t.id ? 'is-hot' : undefined}
                  onMouseEnter={onHighlight ? () => onHighlight(t.id) : undefined}
                  onMouseLeave={onHighlight ? () => onHighlight(null) : undefined}
                >
                  <td className="num whitespace-nowrap text-[var(--ink-3)]">
                    {formatShortDate(t.txn_date)}
                  </td>
                  <td className="font-medium text-[var(--ink)]">
                    {/* Raw UPI strings run to a hundred characters; two lines
                        and the full text on hover, as Transactions does. */}
                    <span className="line-clamp-2 break-words" title={t.description}>
                      {t.description}
                    </span>
                  </td>
                  <td className="max-sm:hidden">
                    {t.tags.length > 0 && (
                      <span className="tagset">
                        {t.tags.map((tag) => (
                          <span key={tag.id} className="tag">
                            {tag.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="max-sm:hidden">
                    {t.shares.length > 0 && (
                      <span className="people">
                        {t.shares.map((s) => (
                          <span key={s.person_id} className="avatar" title={s.person_name}>
                            {s.person_name.trim().charAt(0).toUpperCase() || '?'}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="num">
                    {/* Income is stored negative; the column reads as a size. */}
                    {formatCurrency(Math.abs(Number(t.effective_amount)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
