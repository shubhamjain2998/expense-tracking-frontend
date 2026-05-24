export type BackupShareType = 'percentage' | 'amount'

export interface BackupShare {
  person: string
  share_type: BackupShareType
  share_value: string
  settled: boolean
}

export type BackupTxnType = 'expense' | 'income' | 'refund' | 'transfer'

export interface BackupTransaction {
  txn_date: string
  description: string
  amount: string
  category: string
  notes: string | null
  // Optional so older backups (and hand-authored spreadsheet imports) keep
  // parsing — backend falls back to its classify_txn_type heuristic.
  txn_type: BackupTxnType | null
  tags: string[]
  shares: BackupShare[]
}

export interface BackupExportPayload {
  version: string
  exported_at: string
  categories: { name: string }[]
  tags: { name: string }[]
  persons: { name: string }[]
  budget_plans: { year: number; category: string; allocated_amount: string }[]
  category_mappings: { description_pattern: string; category: string }[]
  transactions: BackupTransaction[]
}

export interface BackupImportResponse {
  categories_created: number
  tags_created: number
  persons_created: number
  budget_plans_created: number
  category_mappings_created: number
  transactions_imported: number
  transactions_skipped_duplicates: number
  skipped_rows: string[]
}

/** Loosely-typed shape used while previewing a user-supplied import file. */
export interface ParsedBackupTransaction {
  txn_date?: unknown
  description?: unknown
  amount?: unknown
  category?: unknown
  tags?: unknown
  shares?: unknown
}

export interface ParsedBackupPayload {
  version?: unknown
  transactions: ParsedBackupTransaction[]
  budget_plans?: unknown[]
  category_mappings?: unknown[] | null
  categories?: unknown[]
  tags?: unknown[]
  persons?: unknown[]
}
