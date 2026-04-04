export interface BudgetEntry {
  id: string
  year: number
  category: string
  allocated_amount: number
}

export interface CreateBudgetPayload {
  year: number
  entries: { category: string; allocated_amount: number }[]
}

export interface UpdateBudgetEntryPayload {
  category?: string
  allocated_amount?: number
}
