import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatShortDate } from '@/lib/format'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import type { PendingManualTransaction } from '@/types/transaction'

interface NeedsReviewProps {
  pendingItems: PendingManualTransaction[]
  isLoading: boolean
}

export function NeedsReview({ pendingItems, isLoading }: NeedsReviewProps) {
  return (
    <div>
      <div className="section-head">
        <div>
          <div className="title">Needs review</div>
          <div className="sub">
            {pendingItems.length === 0
              ? 'No transactions waiting on a category'
              : `${pendingItems.length} transaction${pendingItems.length === 1 ? '' : 's'} waiting on a category`}
          </div>
        </div>
        {pendingItems.length > 0 && (
          <div className="right">
            <Link to={pendingTransactionsUrl(pendingItems)} className="btn" style={{ gap: 6 }}>
              Review all
              <Icon name="arrow_forward" size={13} />
            </Link>
          </div>
        )}
      </div>

      <section className={`card${pendingItems.length === 0 ? '' : 'flush'}`}>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : pendingItems.length === 0 ? (
          <EmptyState
            icon="check_circle"
            title="All caught up"
            description="No transactions pending review."
          />
        ) : (
          <div>
            {pendingItems.slice(0, 6).map((item) => (
              <div key={item.id} className="review-row">
                <div className="review-date">{formatShortDate(item.txn_date)}</div>
                <div className="review-merchant">{item.description}</div>
                <span className="chip accent">Pending</span>
                <div className="review-amount num">
                  −{formatCompact(Math.abs(Number(item.amount)))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
