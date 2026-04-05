export interface RawTransaction {
  id: string
  txn_date: string
  description: string
  amount: number
  deleted: boolean
}

export interface PendingManualTransaction {
  id: string
  date: string
  description: string
  amount: number
}

export interface ProcessedTransaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  split_count: number
  person_ids: string[]
}

export interface ProcessedTransactionItem {
  id: string
  txn_date: string
  description: string
  amount: string
  effective_amount: string
  split_count: number
  category: string
}

export interface PreviewRow {
  txn_date: string
  description: string
  amount: string
}

export interface PreviewResponse {
  rows: PreviewRow[]
  would_insert: number
  skipped: number
}

export interface ImportedRow {
  id: string
  txn_date: string
  description: string
  amount: string
  status: string
}

export interface ImportResponse {
  inserted: number
  skipped: number
  rows: ImportedRow[]
  warnings: string[]
}

export interface AutoCategoriseResponse {
  auto_categorised: number
  pending_manual: number
}

export interface ProcessTransactionPayload {
  raw_txn_id: string
  category: string
  save_mapping: boolean
  split_count: number
  person_ids: string[]
}

export interface EditProcessedPayload {
  category: string
  save_mapping: boolean
  split_count: number
  person_ids: string[]
}
