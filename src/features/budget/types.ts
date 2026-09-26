export interface CategoryTableRow {
  id: string
  categoryId: string
  categoryName: string
  colorIndex: number
  monthlyBudget: number
  thisMonthSpent: number
  ytdSpent: number
  annualBudget: number
  pctUsed: number | null
}

export interface HeatmapRowData {
  categoryId: string
  categoryName: string
  colorIndex: number
  cells: { month: number; spend: number | null; budget: number; percent: number | null }[]
  avgPercent: number | null
}

export interface UnbudgetedCategoryRow {
  categoryId: string
  categoryName: string
  colorIndex: number
  thisMonthSpent: number
  ytdSpent: number
  txnCount: number
}

export interface IncomeTableRow {
  categoryId: string
  categoryName: string
  perMonth: number | null
  receivedThisMonth: number
  ytdReceived: number
}

export interface YearVerdict {
  /** % of the year's annual budget already spent (YTD / annual). */
  pctUsed: number | null
  /** % of the year still remaining, by months elapsed. */
  pctYearLeft: number
  /** Linear projection to year-end at the YTD run-rate. */
  projectedAnnual: number
  /** projectedAnnual - totalAnnual; positive means projected to finish over. */
  diff: number
}
