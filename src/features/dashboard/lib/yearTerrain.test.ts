import type { SummaryRow } from '@/types/dashboard'
import type { ProcessedTransactionItem, TxnType } from '@/types/transaction'

import { buildYearTerrain, OTHER_ROW_LABEL } from './yearTerrain'

let seq = 0
function txn(
  date: string,
  category: string,
  amount: number,
  txn_type: TxnType = 'expense'
): ProcessedTransactionItem {
  seq += 1
  return {
    id: `t${seq}`,
    raw_txn_id: `r${seq}`,
    mapping_id: null,
    category_id: `c-${category}`,
    category,
    txn_date: date,
    description: 'x',
    amount: String(amount),
    effective_amount: String(amount),
    month: Number(date.slice(5, 7)),
    year: Number(date.slice(0, 4)),
    notes: null,
    txn_type,
    shares: [],
    tags: [],
  }
}

function plan(category: string, allocated: number): SummaryRow {
  return { category, allocated_monthly: allocated, actual: 0, variance: 0, pct_used: null }
}

// 15 June 2026: calendar month 6; FY 2026 month 3 (Apr=1).
const NOW = new Date(2026, 5, 15)

describe('buildYearTerrain', () => {
  it('buckets spend by FY period month and marks actual/current/projected columns', () => {
    const t = buildYearTerrain({
      txns: [
        txn('2026-04-03', 'Food', 100),
        txn('2026-05-10', 'Food', 300),
        txn('2026-06-02', 'Food', 50),
        txn('2026-03-31', 'Food', 999), // FY 2025 — excluded
      ],
      summaryRows: [plan('Food', 250)],
      year: 2026,
      mode: 'fy',
      now: NOW,
      monthFraction: 0.5,
    })

    expect(t.currentCol).toBe(2)
    expect(t.months[0].label).toBe('Apr')
    const food = t.cells.filter((c) => c.category === 'Food')
    expect(food).toHaveLength(12)
    expect(food[0]).toMatchObject({ amount: 100, kind: 'actual', over: false })
    expect(food[1]).toMatchObject({ amount: 300, kind: 'actual', over: true })
    expect(food[2]).toMatchObject({ amount: 50, kind: 'current', paceAt: 125 })
    // Projection at the pace of the two completed months.
    expect(food[3]).toMatchObject({ amount: 200, kind: 'projected', over: false, paceAt: null })
    expect(t.max).toBe(300)
  })

  it('nets refunds against spend and ignores income and transfers', () => {
    const t = buildYearTerrain({
      txns: [
        txn('2025-02-01', 'Shopping', 500),
        txn('2025-02-09', 'Shopping', -200, 'refund'),
        txn('2025-02-10', 'Salary', 90000, 'income'),
        txn('2025-02-11', 'Savings', 10000, 'transfer'),
      ],
      summaryRows: [],
      year: 2025,
      mode: 'calendar',
      now: NOW,
      monthFraction: 0.5,
    })

    expect(t.currentCol).toBeNull()
    expect(t.rows.map((r) => r.category)).toEqual(['Shopping'])
    expect(t.cells).toEqual([expect.objectContaining({ col: 1, amount: 300, kind: 'actual' })])
  })

  it('folds categories past the row limit into one unlinked row', () => {
    const txns = ['A', 'B', 'C', 'D'].map((c, i) => txn('2026-01-05', c, 400 - i * 100))
    const t = buildYearTerrain({
      txns,
      summaryRows: [plan('C', 50), plan('D', 20)],
      year: 2026,
      mode: 'calendar',
      now: NOW,
      monthFraction: 0.5,
      maxRows: 3,
    })

    expect(t.rows).toEqual([
      { category: 'A', total: 400, linkable: true },
      { category: 'B', total: 300, linkable: true },
      { category: OTHER_ROW_LABEL, total: 300, linkable: false },
    ])
    const other = t.cells.find((c) => c.category === OTHER_ROW_LABEL && c.col === 0)
    expect(other).toMatchObject({ amount: 300, plan: 70, linkable: false })
  })

  it('scales the only month up by the month fraction when nothing is completed', () => {
    const t = buildYearTerrain({
      txns: [txn('2026-04-10', 'Rent', 250)],
      summaryRows: [],
      year: 2026,
      mode: 'fy',
      now: new Date(2026, 3, 10),
      monthFraction: 0.25,
    })
    expect(t.currentCol).toBe(0)
    expect(t.cells.find((c) => c.col === 1)).toMatchObject({ amount: 1000, kind: 'projected' })
  })

  it('returns an empty terrain for a future year or no spend', () => {
    const future = buildYearTerrain({
      txns: [txn('2026-01-01', 'A', 10)],
      summaryRows: [],
      year: 2027,
      mode: 'calendar',
      now: NOW,
      monthFraction: 0.5,
    })
    expect(future.cells).toEqual([])
    expect(future.rows).toEqual([])

    const none = buildYearTerrain({
      txns: [],
      summaryRows: [plan('A', 100)],
      year: 2026,
      mode: 'calendar',
      now: NOW,
      monthFraction: 0.5,
    })
    expect(none.cells).toEqual([])
  })
})
