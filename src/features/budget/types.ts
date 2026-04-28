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
  hasOverride: boolean
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
}
