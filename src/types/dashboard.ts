export interface SummaryRow {
  category: string
  allocated_monthly: number
  actual: number
  variance: number
  pct_used: number | null
}

export interface TrendDataPoint {
  month: number
  amount: number
}

export interface SplitLedgerRow {
  person_id: string
  person_name: string
  total_amount: number
}

export interface YTDRow {
  category: string
  allocated_ytd: number
  actual_ytd: number
  variance: number
  pct_used: number | null
}
