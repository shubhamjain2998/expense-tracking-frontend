import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact } from '@/lib/format'
import type { PendingManualTransaction } from '@/types/transaction'

interface NeedsReviewProps {
  pendingItems: PendingManualTransaction[]
  isLoading: boolean
}

export function NeedsReview({ pendingItems, isLoading }: NeedsReviewProps) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Needs review</p>
          <p className="card-sub">{pendingItems.length} pending</p>
        </div>
        {pendingItems.length > 0 && (
          <Link to="/transactions" className="btn sm" style={{ gap: 4 }}>
            Review all
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              arrow_forward
            </span>
          </Link>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : pendingItems.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="All caught up"
          description="No transactions pending review."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pendingItems.slice(0, 6).map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom:
                  i < Math.min(pendingItems.length, 6) - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--mono)',
                    flexShrink: 0,
                  }}
                >
                  {item.txn_date.split('T')[0].slice(5)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--ink)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.description}
                </span>
              </div>
              <span
                className="num"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  flexShrink: 0,
                  paddingLeft: 12,
                }}
              >
                {formatCompact(Math.abs(Number(item.amount)))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
