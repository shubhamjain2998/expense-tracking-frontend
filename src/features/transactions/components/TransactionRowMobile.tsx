import { Icon } from '@/components/ui/Icon'
import { formatShortDate } from '@/lib/format'

import { categoryColor } from '../lib/categoryColor'
import { formatAmount, isCreditAmount, splitInfo } from '../lib/txnFormat'
import type { UnifiedTxn } from '../types'

interface TransactionRowMobileProps {
  txn: UnifiedTxn
  isSelected: boolean
  onTap: () => void
}

/**
 * Mobile-only card row. Replaces the `<tr>`-based TransactionRow when the
 * viewport is below 767px. Single tap opens the existing side panel (process
 * for pending, edit for processed) — no drag, no inline category quick-pick,
 * no checkbox. Those interactions move to the panel.
 */
export function TransactionRowMobile({ txn, isSelected, onTap }: TransactionRowMobileProps) {
  const isDeleted = txn.kind === 'deleted'
  const catColor = txn.categoryId ? categoryColor(txn.categoryId) : 'var(--warn)'
  const { display: amtDisplay } = formatAmount(txn.effectiveAmount, txn.txnType)
  const isPendingCredit = txn.kind === 'pending' && isCreditAmount(txn.effectiveAmount)
  const split = splitInfo(txn)

  let categoryLabel: string
  let categoryColorRef: string
  if (txn.kind === 'pending') {
    categoryLabel = isPendingCredit ? 'credit?' : 'pending'
    categoryColorRef = isPendingCredit ? 'var(--pos)' : 'var(--warn)'
  } else if (isDeleted) {
    categoryLabel = 'deleted'
    categoryColorRef = 'var(--neg)'
  } else if (txn.txnType === 'refund') {
    categoryLabel = `refund · ${txn.category ?? ''}`
    categoryColorRef = 'var(--pos)'
  } else if (txn.txnType === 'transfer') {
    categoryLabel = 'transfer'
    categoryColorRef = 'var(--ink-3)'
  } else {
    categoryLabel = txn.category ?? '—'
    categoryColorRef = catColor
  }

  const amtColor =
    txn.txnType === 'income' || txn.txnType === 'refund'
      ? 'var(--pos)'
      : txn.txnType === 'transfer'
        ? 'var(--ink-3)'
        : isPendingCredit
          ? 'var(--pos)'
          : 'var(--ink)'

  return (
    <button
      type="button"
      onClick={isDeleted ? undefined : onTap}
      className={isSelected ? 'list-row on w-full text-left' : 'list-row w-full text-left'}
      style={{
        background: isSelected ? 'var(--accent-soft)' : undefined,
        opacity: isDeleted ? 0.55 : 1,
      }}
    >
      <div className="l-main">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="l-title truncate"
            style={{ textDecoration: isDeleted ? 'line-through' : 'none' }}
          >
            {txn.description}
          </span>
          <span className="shrink-0 text-right">
            <span className="l-amount block" style={{ color: amtColor, fontWeight: 600 }}>
              {txn.txnType === 'income' || (isPendingCredit && !txn.txnType)
                ? '+'
                : txn.txnType === 'refund'
                  ? '-'
                  : ''}
              {amtDisplay}
            </span>
            {/* Your share is above; the full bill is what the others need. */}
            {split && (
              <span className="num block text-[10.5px] text-[var(--ink-3)]">
                of {split.totalDisplay}
              </span>
            )}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
          <span className="num shrink-0">{formatShortDate(txn.txn_date)}</span>
          <span className="text-[var(--ink-3)]">·</span>
          <span
            className="inline-flex items-center gap-1.5 truncate"
            style={{ color: categoryColorRef }}
          >
            <span
              aria-hidden
              className="inline-block size-[6px] shrink-0 rounded-full"
              style={{ background: categoryColorRef }}
            />
            <span className="truncate">{categoryLabel}</span>
          </span>
          {split && (
            <span
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-[var(--accent)]"
              title={split.breakdown}
            >
              <Icon name="call_split" size={12} />
              {split.peopleCount} ways
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
