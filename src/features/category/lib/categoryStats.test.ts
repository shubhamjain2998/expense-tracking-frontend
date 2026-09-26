import type { ProcessedTransactionItem, TxnType } from '@/types/transaction'

import {
  categoryFlow,
  categoryMonthlySeries,
  computeCategoryStats,
  merchantBreakdown,
  txnCalMonth,
} from './categoryStats'

function txn(
  category: string,
  date: string,
  amount: number,
  txn_type: TxnType = 'expense'
): ProcessedTransactionItem {
  return {
    id: `${category}-${date}-${amount}`,
    category,
    txn_date: date,
    description: category,
    effective_amount: String(amount),
    txn_type,
    tags: [],
  } as unknown as ProcessedTransactionItem
}

describe('categoryStats', () => {
  it('reads a category as income when most of its transactions are income', () => {
    const txns = [
      txn('salary', '2026-06-01', -100000, 'income'),
      txn('salary', '2026-05-01', -100000, 'income'),
      txn('misc', '2026-06-02', 50),
      txn('misc', '2026-06-03', -20, 'income'),
    ]
    expect(categoryFlow(txns, 'salary')).toBe('income')
    expect(categoryFlow(txns, 'misc')).toBe('expense')
    expect(categoryFlow(txns, 'unknown')).toBe('expense')
  })

  it('sums an income category from its income transactions', () => {
    const txns = [
      txn('salary', '2026-06-01', -100000, 'income'),
      txn('salary', '2026-05-01', -90000, 'income'),
    ]
    const series = categoryMonthlySeries(txns, 'salary', 2026, 6, 3, 'income')
    expect(series.map((p) => p.amount)).toEqual([0, 90000, 100000])
    expect(categoryMonthlySeries(txns, 'salary', 2026, 6, 3).map((p) => p.amount)).toEqual([
      0, 0, 0,
    ])
    expect(merchantBreakdown(txns, 'income')[0]).toMatchObject({ total: 190000, count: 2 })
  })

  it("buckets by the date string's own month, not a UTC-parsed Date", () => {
    expect(txnCalMonth(txn('food', '2026-06-01', 10))).toEqual({ year: 2026, month: 6 })
    const series = categoryMonthlySeries([txn('food', '2026-06-01', 10)], 'food', 2026, 6, 2)
    expect(series.map((p) => p.amount)).toEqual([0, 10])
  })

  it("reports last month's share even when this month has no transactions", () => {
    const prev = [txn('food', '2026-05-10', 25), txn('rent', '2026-05-01', 75)]
    const series = categoryMonthlySeries(prev, 'food', 2026, 6, 2)
    const stats = computeCategoryStats(series, [], [], prev)
    expect(stats.thisMonth).toBe(0)
    expect(stats.prevShareOfSpend).toBe(0.25)
  })

  it('gives tied months one rank', () => {
    const series = categoryMonthlySeries([txn('food', '2026-04-02', 30)], 'food', 2026, 6, 4)
    expect(computeCategoryStats(series, [], [], []).thisMonthRank).toBe(2)
  })
})
