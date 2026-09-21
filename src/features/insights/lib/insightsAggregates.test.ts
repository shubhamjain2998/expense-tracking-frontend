import type { SplitLedgerRow } from '@/types/dashboard'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { computeInsightsAggregates } from './insightsAggregates'

function txn(overrides: Partial<ProcessedTransactionItem> = {}): ProcessedTransactionItem {
  return {
    id: crypto.randomUUID(),
    raw_txn_id: crypto.randomUUID(),
    mapping_id: null,
    category_id: 'cat-1',
    category: 'Dining',
    txn_date: '2026-06-10',
    description: 'Zomato',
    amount: '500',
    effective_amount: '500',
    month: 6,
    year: 2026,
    notes: null,
    txn_type: 'expense',
    shares: [],
    tags: [],
    ...overrides,
  }
}

const NOW = new Date('2026-06-15T00:00:00Z')

describe('computeInsightsAggregates', () => {
  it('excludes transactions outside the trailing window', () => {
    const old = txn({ txn_date: '2020-01-01', effective_amount: '999' })
    const recent = txn({ txn_date: '2026-06-01', effective_amount: '100' })
    const agg = computeInsightsAggregates([old, recent], [], NOW, 15)
    const total = agg.categoryMonthTotals.reduce((s, r) => s + r.total, 0)
    expect(total).toBe(100)
  })

  it('sums per-category-per-month expense totals', () => {
    const txns = [
      txn({ txn_date: '2026-06-01', category: 'Dining', effective_amount: '100' }),
      txn({ txn_date: '2026-06-15', category: 'Dining', effective_amount: '200' }),
      txn({ txn_date: '2026-06-15', category: 'Travel', effective_amount: '50' }),
    ]
    const agg = computeInsightsAggregates(txns, [], NOW, 15)
    const dining = agg.categoryMonthTotals.find(
      (r) => r.category === 'Dining' && r.month === '2026-06'
    )
    expect(dining?.total).toBe(300)
  })

  it('groups income by category, ignoring expenses', () => {
    const txns = [
      txn({ txn_type: 'income', category: 'Salary', effective_amount: '-50000' }),
      txn({ txn_type: 'expense', category: 'Salary', effective_amount: '10' }), // should not count
    ]
    const agg = computeInsightsAggregates(txns, [], NOW, 15)
    expect(agg.incomeBySource).toEqual([{ category: 'Salary', total: 50000 }])
  })

  it('maps the split ledger and drops zero/negative rows', () => {
    const ledger: SplitLedgerRow[] = [
      { person_name: 'Alex', total_split_amount: '400' },
      { person_name: 'Sam', total_split_amount: '0' },
    ]
    const agg = computeInsightsAggregates([], ledger, NOW, 15)
    expect(agg.splitLedger).toEqual([{ person: 'Alex', theyOweYou: 400 }])
  })

  it('ranks top transactions by absolute amount, signed', () => {
    const txns = [
      txn({ effective_amount: '-9000', description: 'Salary credit', txn_type: 'income' }),
      txn({ effective_amount: '200', description: 'Coffee' }),
    ]
    const agg = computeInsightsAggregates(txns, [], NOW, 15)
    expect(agg.topTransactions[0].description).toBe('Salary credit')
    expect(agg.topTransactions[0].amount).toBe(-9000)
  })

  it('flags an expense far above its category median as an outlier', () => {
    const normal = Array.from({ length: 6 }, (_, i) =>
      txn({ txn_date: `2026-0${(i % 5) + 1}-05`, effective_amount: '500', description: `n${i}` })
    )
    const spike = txn({ txn_date: '2026-06-05', effective_amount: '5000', description: 'Big one' })
    const agg = computeInsightsAggregates([...normal, spike], [], NOW, 15)
    expect(agg.outliers.some((o) => o.description === 'Big one')).toBe(true)
    expect(agg.outliers.some((o) => o.description === 'n0')).toBe(false)
  })

  it('does not flag outliers in categories with too few transactions', () => {
    const txns = [
      txn({ effective_amount: '100', description: 'a' }),
      txn({ effective_amount: '9000', description: 'b' }),
    ]
    const agg = computeInsightsAggregates(txns, [], NOW, 15)
    expect(agg.outliers).toHaveLength(0)
  })

  it('surfaces commitments detected by the shared recurring engine', () => {
    const rentCharges = Array.from({ length: 7 }, (_, i) =>
      txn({
        txn_date: `2026-0${(i % 6) + 1}-01`,
        description: 'Rent',
        category: 'Housing',
        effective_amount: '20000',
      })
    )
    const agg = computeInsightsAggregates(rentCharges, [], NOW, 15)
    expect(agg.commitments.some((c) => c.name === 'Rent' && c.monthlyAmount === 20000)).toBe(true)
  })

  it('computes a period start/end spanning the window', () => {
    const agg = computeInsightsAggregates([], [], NOW, 15)
    expect(agg.periodStart).toBe('2025-04-01')
    expect(agg.periodEnd).toBe('2026-06-30')
    expect(agg.monthsCovered).toBe(15)
  })
})
