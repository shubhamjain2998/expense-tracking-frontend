export interface RawTransaction {
  id: string
  date: string
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

export interface PreviewTransaction {
  date: string
  description: string
  amount: number
  category?: string
  status: 'ready' | 'warning'
}

export interface PreviewResponse {
  transactions: PreviewTransaction[]
  would_insert: number
  warnings: string[]
}

export interface ImportResponse {
  imported: number
  skipped: number
}

export interface AutoCategoriseResponse {
  categorised: number
  pending: number
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
