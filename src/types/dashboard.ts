export interface SummaryRow {
  category: string
  allocated_monthly: number
  actual: number
  variance: number
  pct_used: number | null
}

export interface TrendDataPoint {
  month: number
  actual_amount: string
  income_amount?: string
  txn_count?: number
}

export interface SplitLedgerRow {
  person_name: string
  total_split_amount: string
}

export interface YTDRow {
  category: string
  allocated_ytd: number
  actual_ytd: number
  variance: number
  pct_used: number | null
}

export interface MultiMonthCategoryRow {
  category: string
  actual: string
}

export interface MultiMonthSummaryItem {
  year: number
  /** Calendar month (1=Jan … 12=Dec) */
  month: number
  expense_total: string
  income_total: string
  category_breakdown: MultiMonthCategoryRow[]
}
