import type { Tag } from './settings'

export type TransactionStatus = 'pending' | 'processed' | 'deleted'
export type ShareType = 'percentage' | 'amount'

export interface RawTransaction {
  id: string
  txn_date: string
  description: string
  amount: string
  status: TransactionStatus
}

export interface PendingManualTransaction {
  id: string
  txn_date: string
  description: string
  amount: string
  status: TransactionStatus
}

export interface PersonShareOut {
  person_id: string
  person_name: string
  share_type: ShareType
  share_value: string
  share_amount: string
  settled: boolean
}

export interface PersonShareIn {
  person_id: string
  share_type: ShareType
  share_value: number
}

export interface ProcessedTransactionItem {
  id: string
  raw_txn_id: string
  mapping_id: string | null
  category_id: string
  category: string
  txn_date: string
  description: string
  amount: string
  effective_amount: string
  month: number
  year: number
  notes: string | null
  shares: PersonShareOut[]
  tags: Tag[]
}

export type ProcessedTransaction = ProcessedTransactionItem

export interface PreviewRow {
  txn_date: string
  description: string
  amount: string
}

export interface PreviewResponse {
  rows: PreviewRow[]
  would_insert: number
  skipped: number
  skipped_rows: string[]
}

export interface ImportedRow {
  id: string
  txn_date: string
  description: string
  amount: string
  status: TransactionStatus
}

export interface ImportResponse {
  inserted: number
  skipped: number
  skipped_rows: string[]
  rows: ImportedRow[]
  warnings: string[]
}

export interface AutoCategoriseResponse {
  auto_categorised: number
  pending_manual: number
}

export interface ProcessTransactionPayload {
  raw_txn_id: string
  category_id: string
  save_mapping: boolean
  shares: PersonShareIn[]
  notes?: string | null
  tag_ids?: string[]
}

export interface EditProcessedPayload {
  category_id?: string
  save_mapping?: boolean
  shares?: PersonShareIn[]
  notes?: string | null
  tag_ids?: string[]
  amount?: number
  txn_date?: string
  description?: string
}

export interface CreateRawTransactionPayload {
  txn_date: string
  description: string
  amount: number
}
