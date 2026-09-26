import { describe, expect, it } from 'vitest'

import type { BudgetEntry } from '@/types/budget'
import type { YTDRow } from '@/types/dashboard'
import type { Category } from '@/types/settings'

import { buildIncomeRows, buildUnbudgetedRows } from './budgetMath'

// Phase 9: "Expected income" always showed ₹0 in "Received in <month>"
// because it used to derive that figure from GET /dashboard/summary, which
// the backend filters to txn_type in (expense, refund) — income categories
// never appear in it. buildIncomeRows now takes the same per-category
// income totals Home computes from the month's processed transactions
// (useDashboardData.incomeByCategory), matching the abs()-of-negative
// convention already used for ytdReceived.
describe('buildIncomeRows', () => {
  const categories: Category[] = [
    { id: 'cat-salary', name: 'Salary', is_income: true },
    { id: 'cat-dividend', name: 'Dividend', is_income: true },
    { id: 'cat-groceries', name: 'Groceries', is_income: false },
  ]
  const entries: BudgetEntry[] = [
    {
      id: 'e1',
      year: 2026,
      category_id: 'cat-salary',
      allocated_amount: '1200000',
      category: 'Salary',
    },
  ]
  const ytd: YTDRow[] = [
    {
      category: 'Salary',
      allocated_ytd: 1200000,
      actual_ytd: -1060653,
      variance: 0,
      pct_used: null,
    },
    { category: 'Dividend', allocated_ytd: 0, actual_ytd: -500, variance: 0, pct_used: null },
  ]

  it('only includes categories flagged is_income, in category order', () => {
    const rows = buildIncomeRows(categories, entries, [], ytd)
    expect(rows.map((r) => r.categoryName)).toEqual(['Salary', 'Dividend'])
  })

  it('takes receivedThisMonth from incomeByCategory (not the expense summary), abs()ing the total', () => {
    const rows = buildIncomeRows(categories, entries, [{ category: 'Salary', total: 219337 }], ytd)
    const salary = rows.find((r) => r.categoryName === 'Salary')!
    expect(salary.receivedThisMonth).toBe(219337)
  })

  it('an income category absent from incomeByCategory (no activity this month) reads 0, not NaN', () => {
    const rows = buildIncomeRows(categories, entries, [{ category: 'Salary', total: 219337 }], ytd)
    const dividend = rows.find((r) => r.categoryName === 'Dividend')!
    expect(dividend.receivedThisMonth).toBe(0)
  })

  it('abs()es a negative incomeByCategory total the same way ytdReceived is abs()ed', () => {
    const rows = buildIncomeRows(categories, entries, [{ category: 'Salary', total: -219337 }], ytd)
    const salary = rows.find((r) => r.categoryName === 'Salary')!
    expect(salary.receivedThisMonth).toBe(219337)
    expect(salary.ytdReceived).toBe(1060653)
  })

  it('perMonth is null when the income category has no budget entry', () => {
    const rows = buildIncomeRows(categories, entries, [], ytd)
    const dividend = rows.find((r) => r.categoryName === 'Dividend')!
    expect(dividend.perMonth).toBeNull()
  })
})

describe('buildUnbudgetedRows', () => {
  const ytdRow = (category: string, actual: number): YTDRow => ({
    category,
    allocated_ytd: 0,
    actual_ytd: actual,
    variance: 0,
    pct_used: null,
  })

  it('lists every unbudgeted expense category except those that net to money in', () => {
    const categories: Category[] = [
      { id: 'c-food', name: 'Food', is_income: false },
      { id: 'c-rent', name: 'Rent', is_income: false },
      { id: 'c-new', name: 'New', is_income: false },
      // Income in practice but never flagged: nets negative for the year.
      { id: 'c-salary', name: 'Salary', is_income: false },
      { id: 'c-bonus', name: 'Bonus', is_income: true },
    ]
    const entries: BudgetEntry[] = [
      { id: 'e1', year: 2026, category_id: 'c-rent', allocated_amount: '1200', category: 'Rent' },
    ]
    const ytd = [ytdRow('Food', 500), ytdRow('Salary', -90000)]

    const rows = buildUnbudgetedRows(categories, entries, [], ytd)

    expect(rows.map((r) => r.categoryName)).toEqual(['Food', 'New'])
  })
})
