import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { ProcessedTransactionItem } from '@/types/transaction'

interface CategoryTransactionsTableProps {
  txns: ProcessedTransactionItem[]
  monthLabel: string
  /** `/transactions?year=&month=` for the same period, in Transactions'
   *  own period-year numbering — Transactions doesn't yet read a category
   *  filter from the URL (that page is out of scope this phase), so this
   *  lands on the right month rather than a category-filtered view. */
  openInTransactionsHref: string
  isLoading: boolean
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

      <div className="card card-flush">
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
                <th>Tags</th>
                <th>With</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id}>
                  <td className="num text-[var(--ink-3)]">{formatShortDate(t.txn_date)}</td>
                  <td className="font-medium text-[var(--ink)]">{t.description}</td>
                  <td>
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
                  <td>
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
                  <td className="num">{formatCurrency(Number(t.effective_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
