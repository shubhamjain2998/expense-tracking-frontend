import type { BudgetEntry } from '@/types/budget'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { categoryMonthBudget, type CategoryMonthPoint } from '../lib/categoryStats'

import { breakdownX, daySlotZ, daysLabels, monthsLabels } from './layout'
import { buildBreakdown, buildDays, buildMonths } from './stationData'

function point(year: number, month: number, amount: number): CategoryMonthPoint {
  return { year, month, label: `m${month}`, amount }
}

function txn(id: string, date: string, amount: number, description = id): ProcessedTransactionItem {
  return {
    id,
    txn_date: date,
    description,
    effective_amount: String(amount),
    txn_type: 'expense',
  } as ProcessedTransactionItem
}

describe('category world stationData', () => {
  it('marks the last month selected, flags over-budget months and scales to the tallest figure', () => {
    const m = buildMonths([point(2025, 12, 50), point(2026, 1, 120), point(2026, 2, 80)], (y) =>
      y === 2026 ? 100 : 0
    )
    expect(m.columns.map((c) => [c.budget, c.over, c.selected])).toEqual([
      [0, false, false],
      [100, true, false],
      [100, false, true],
    ])
    expect(m.max).toBe(120)
    expect(m.median).toBe(80)
    expect(buildMonths([], () => 0)).toMatchObject({ columns: [], median: null, max: 0 })
  })

  it('keeps the top eight of each breakdown, ranked, on one shared scale', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ name: `m${i}`, total: 100 - i, count: 1 }))
    const b = buildBreakdown(rows, [{ name: 'lunch', total: 300, count: 4 }])
    expect(b.merchants).toHaveLength(8)
    expect(b.merchants[0]).toMatchObject({ key: 'merchant:m0', rank: 0 })
    expect(b.tags[0]).toMatchObject({ key: 'tag:lunch', kind: 'tag', rank: 0 })
    expect(b.max).toBe(300)
    // Tags sit to the right of every merchant.
    expect(breakdownX(b, b.tags[0])).toBeGreaterThan(breakdownX(b, b.merchants[7]))
  })

  it('places each transaction on its day, smallest in front', () => {
    const d = buildDays(
      [
        txn('a', '2026-06-01', 400),
        txn('b', '2026-06-01', 20),
        txn('c', '2026-06-30', 90),
        txn('bad', '2026-06-31', 10),
        txn('zero', '2026-06-02', 0),
      ],
      2026,
      6
    )
    expect(d.daysInMonth).toBe(30)
    expect(d.blocks.map((b) => [b.id, b.day, b.slot])).toEqual([
      ['b', 1, 0],
      ['a', 1, 1],
      ['c', 30, 0],
    ])
    expect(d.depth).toBe(2)
    expect(d.max).toBe(400)
    expect(daySlotZ(0, 2)).toBeGreaterThan(daySlotZ(1, 2))
  })
})

describe('category world layout', () => {
  it('labels months with the year on the first and each January, and the selected month', () => {
    const m = buildMonths([point(2025, 12, 50), point(2026, 1, 120)], () => 0)
    const labels = monthsLabels(m)
    expect(labels.map((l) => l.text)).toEqual(['m12 25', 'm1 26', '₹120', 'Median ₹85'])
    expect(labels.filter((l) => l.tone === 'current')).toHaveLength(2)
  })

  it('numbers the 1st, every 5th and the last day', () => {
    const d = buildDays([], 2026, 2)
    expect(daysLabels(d).map((l) => l.text)).toEqual(['1', '5', '10', '15', '20', '25', '28'])
  })
})

describe('categoryMonthBudget', () => {
  const entries = [{ category: 'food', allocated_amount: '1200' }] as BudgetEntry[]

  it('is a twelfth of the annual plan, else 0', () => {
    expect(categoryMonthBudget(entries, 'food')).toBe(100)
    expect(categoryMonthBudget(entries, 'rent')).toBe(0)
    expect(categoryMonthBudget(undefined, 'food')).toBe(0)
  })
})
