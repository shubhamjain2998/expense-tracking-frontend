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
