import { Icon } from '@/components/ui/Icon'
import { formatShortDate } from '@/lib/format'

import { categoryColor } from '../lib/categoryColor'
import { formatAmount, isCreditAmount } from '../lib/txnFormat'
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
          <span className="l-amount shrink-0" style={{ color: amtColor, fontWeight: 600 }}>
            {txn.txnType === 'income' || (isPendingCredit && !txn.txnType)
              ? '+'
              : txn.txnType === 'refund'
                ? '-'
                : ''}
            {amtDisplay}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
          <span className="num shrink-0">{formatShortDate(txn.txn_date)}</span>
          <span className="text-[var(--ink-4)]">·</span>
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
          {txn.shares.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[var(--accent)]">
              <Icon name="call_split" size={12} />
              {txn.shares.length}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
