import type { YTDRow } from '@/types/dashboard'

export interface LastActiveMonthHint {
  /** Calendar month (1–12) of the last month with recorded activity. */
  month: number
  year: number
  /** Human-readable label, e.g. "January 2026". */
  label: string
}

export interface CategoryStat {
  category: string
  total: number
  count: number
  avg: number
}

export interface YtdDataPoint {
  month: string
  actual: number | null
  expected: number | null
  projected: number | null
}

export interface IncomeExpenseTrendPoint {
  month: string
  income: number
  expense: number
  savings: number
}

export interface DeepDiveTxnItem {
  id: string
  txn_date: string
  description: string
  effective_amount: string
  category: string
}

export interface MonthStat {
  periodMonth: number
  expense: number
  income: number
  savings: number
}

export interface YtdComputedData {
  ytdIncomeSources: { category: string; total: number }[]
  ytdIncomeTotal: number
  ytdSaved: number
  savingsRate: number | null
  projectedFYIncome: number
  projectedFYSavings: number
  projectedFYSavingsRate: number | null
  monthlyStats: MonthStat[]
  totalExpenseCount: number
  momPct: number | null
  avgExpense: number
  highestMonth: MonthStat | null
  lowestMonth: MonthStat | null
  bestSavingsMonth: MonthStat | null
  incomeMonthlyAvg: number
  spentMonthlyAvg: number
  budgetPace: number | null
  expenseCategories: YTDRow[]
  maxExpense: number
}
