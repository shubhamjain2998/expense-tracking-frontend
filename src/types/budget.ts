export interface BudgetEntry {
  id: string
  year: number
  category_id: string
  category: string
  allocated_amount: string
}

export interface CreateBudgetPayload {
  year: number
  entries: { category_id: string; allocated_amount: number }[]
}

export interface UpdateBudgetEntryPayload {
  category_id?: string
  allocated_amount?: number
}

// Per-month budget override (requires new backend endpoints)
export interface MonthlyBudgetOverride {
  year: number
  month: number
  category_id: string
  category: string
  allocated_amount: number
}
