import type { ProcessedTransactionItem, RawTransaction } from '@/types/transaction'

import type { UnifiedTxn } from '../types'

export function buildUnified(
  raw: RawTransaction[],
  processed: ProcessedTransactionItem[]
): UnifiedTxn[] {
  const list: UnifiedTxn[] = []

  for (const r of raw) {
    list.push({
      uid: 'raw_' + r.id,
      txn_date: r.txn_date,
      description: r.description,
      amount: r.amount,
      effectiveAmount: r.amount,
      kind: r.status === 'deleted' ? 'deleted' : 'pending',
      tags: [],
      shares: [],
      rawId: r.id,
      rawOriginal: r,
    })
  }

  for (const p of processed) {
    list.push({
      uid: 'proc_' + p.id,
      txn_date: p.txn_date,
      description: p.description,
      amount: p.amount,
      effectiveAmount: p.effective_amount,
      kind: 'processed',
      category: p.category,
      categoryId: p.category_id,
      tags: p.tags,
      shares: p.shares,
      notes: p.notes,
      rawId: p.raw_txn_id,
      processedId: p.id,
      processedOriginal: p,
    })
  }

  list.sort(
    (a, b) => b.txn_date.localeCompare(a.txn_date) || a.description.localeCompare(b.description)
  )
  return list
}
