import type { Tag } from '@/types/settings'
import type { ProcessedTransactionItem, RawTransaction } from '@/types/transaction'

export type TxnKind = 'pending' | 'processed' | 'deleted'

export interface UnifiedTxn {
  uid: string
  txn_date: string
  description: string
  amount: string
  effectiveAmount: string
  kind: TxnKind
  category?: string
  categoryId?: string
  tags: Tag[]
  shares: ProcessedTransactionItem['shares']
  notes?: string | null
  rawId?: string
  processedId?: string
  rawOriginal?: RawTransaction
  processedOriginal?: ProcessedTransactionItem
}

export type StatusFilter = 'all' | 'pending' | 'income' | 'processed' | 'split'
export type SortCol = 'date' | 'amount' | 'category'
export type SortDir = 'asc' | 'desc'
