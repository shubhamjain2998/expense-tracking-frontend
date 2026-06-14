import { describe, expect, it } from 'vitest'

import type { ProcessedTransactionItem, TxnType } from '@/types/transaction'

import { HABIT_GROUPS, computeHabits, computeTagSpend } from './habits'

let seq = 0

/** Build a minimal ProcessedTransactionItem fixture. */
function txn(opts: {
  date: string
  amount: number | string
  tags?: string[]
  category?: string
  type?: TxnType
}): ProcessedTransactionItem {
  seq += 1
  const id = `t${seq}`
  return {
    id,
    raw_txn_id: `r${seq}`,
    mapping_id: null,
    category_id: 'c1',
    category: opts.category ?? 'Misc',
    txn_date: opts.date,
    description: `txn ${id}`,
    amount: String(opts.amount),
    effective_amount: String(opts.amount),
    month: new Date(opts.date).getMonth() + 1,
    year: new Date(opts.date).getFullYear(),
    notes: null,
    txn_type: opts.type ?? 'expense',
    shares: [],
    tags: (opts.tags ?? []).map((name, i) => ({ id: `${id}-tag${i}`, name })),
  } as ProcessedTransactionItem
}

const NOW = new Date('2026-06-14T23:59:59Z')

describe('computeHabits', () => {
  it('rolls distinct tags into the same curated habit group', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 200, tags: ['daily meals'] }),
      txn({ date: '2026-06-05', amount: 300, tags: ['biryani'] }),
    ]
    const res = computeHabits(txns, NOW)
    const eating = res.habits.find((h) => h.label === 'Eating out')
    expect(eating).toBeDefined()
    expect(eating!.total).toBe(500)
    expect(eating!.txnCount).toBe(2)
  })

  it('matches tags case-insensitively and trimmed', () => {
    const txns = [txn({ date: '2026-06-01', amount: 100, tags: ['  SWIGGY '] })]
    const res = computeHabits(txns, NOW)
    expect(res.habits.find((h) => h.label === 'Eating out')?.total).toBe(100)
  })

  it('aggregates topHabit.categories across distinct contributing categories', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 400, tags: ['daily meals'], category: 'Food' }),
      txn({ date: '2026-06-02', amount: 600, tags: ['zomato'], category: 'Family' }),
      txn({ date: '2026-06-03', amount: 100, tags: ['cafe / snacks'], category: 'Food' }),
    ]
    const res = computeHabits(txns, NOW)
    expect(res.topHabit).not.toBeNull()
    expect(res.topHabit!.label).toBe('Eating out')
    expect(res.topHabit!.categories).toEqual(['Family', 'Food'])
  })

  it('excludes txns older than the trailing window', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 500, tags: ['grocery'] }),
      // 8 months back, outside a 6-month window
      txn({ date: '2025-10-01', amount: 999, tags: ['grocery'] }),
    ]
    const res = computeHabits(txns, NOW, 6)
    const groceries = res.habits.find((h) => h.label === 'Groceries')
    expect(groceries!.total).toBe(500)
    expect(groceries!.txnCount).toBe(1)
  })

  it('includes txns within the inclusive window boundaries', () => {
    const txns = [
      txn({ date: '2026-06-10T00:00:00Z', amount: 50, tags: ['gym'] }), // just inside now
      txn({ date: '2025-12-18T00:00:00Z', amount: 70, tags: ['gym'] }), // just inside now - 6mo
    ]
    const res = computeHabits(txns, NOW, 6)
    expect(res.habits.find((h) => h.label === 'Fitness')!.total).toBe(120)
  })

  it('perMonth divides by the number of distinct months covered', () => {
    const txns = [
      txn({ date: '2026-04-10', amount: 300, tags: ['fuel'] }),
      txn({ date: '2026-05-10', amount: 300, tags: ['uber'] }),
      txn({ date: '2026-06-10', amount: 300, tags: ['ola'] }),
    ]
    const res = computeHabits(txns, NOW)
    const transport = res.habits.find((h) => h.label === 'Transport/Fuel')!
    expect(res.monthsCovered).toBe(3)
    expect(transport.total).toBe(900)
    expect(transport.perMonth).toBe(300)
  })

  it('counts a multi-tagged txn toward multiple habits', () => {
    const txns = [txn({ date: '2026-06-01', amount: 100, tags: ['swiggy', 'gym'] })]
    const res = computeHabits(txns, NOW)
    expect(res.habits.find((h) => h.label === 'Eating out')!.total).toBe(100)
    expect(res.habits.find((h) => h.label === 'Fitness')!.total).toBe(100)
  })

  it('only counts expenses, ignoring income/refund/transfer', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 100, tags: ['netflix'], type: 'expense' }),
      txn({ date: '2026-06-02', amount: 500, tags: ['netflix'], type: 'income' }),
      txn({ date: '2026-06-03', amount: 500, tags: ['netflix'], type: 'refund' }),
    ]
    const res = computeHabits(txns, NOW)
    expect(res.habits.find((h) => h.label === 'Subscriptions/OTT')!.total).toBe(100)
  })

  it('drops habits with zero total and sorts by total desc', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 100, tags: ['grocery'] }),
      txn({ date: '2026-06-02', amount: 900, tags: ['daily meals'] }),
    ]
    const res = computeHabits(txns, NOW)
    expect(res.habits.map((h) => h.label)).toEqual(['Eating out', 'Groceries'])
    // No habit should have total 0
    expect(res.habits.every((h) => h.total > 0)).toBe(true)
  })

  it('returns empty result for empty input without throwing', () => {
    const res = computeHabits([], NOW)
    expect(res.habits).toEqual([])
    expect(res.topHabit).toBeNull()
    expect(res.monthsCovered).toBeGreaterThanOrEqual(0)
  })

  it('uses absolute value of effective_amount', () => {
    const txns = [txn({ date: '2026-06-01', amount: -250, tags: ['blinkit'] })]
    const res = computeHabits(txns, NOW)
    expect(res.habits.find((h) => h.label === 'Groceries')!.total).toBe(250)
  })
})

describe('computeTagSpend', () => {
  it('returns per-tag sums for all tags, sorted desc', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 100, tags: ['daily meals'] }),
      txn({ date: '2026-06-02', amount: 400, tags: ['daily meals'] }),
      txn({ date: '2026-06-03', amount: 250, tags: ['random other tag'] }),
    ]
    const res = computeTagSpend(txns, NOW)
    expect(res).toEqual([
      { label: 'daily meals', total: 500, txnCount: 2 },
      { label: 'random other tag', total: 250, txnCount: 1 },
    ])
  })

  it('respects the trailing window and expense-only filter', () => {
    const txns = [
      txn({ date: '2026-06-01', amount: 100, tags: ['fuel'] }),
      txn({ date: '2024-01-01', amount: 999, tags: ['fuel'] }), // outside window
      txn({ date: '2026-06-02', amount: 999, tags: ['fuel'], type: 'income' }), // not expense
    ]
    const res = computeTagSpend(txns, NOW)
    expect(res).toEqual([{ label: 'fuel', total: 100, txnCount: 1 }])
  })

  it('returns empty for empty input', () => {
    expect(computeTagSpend([], NOW)).toEqual([])
  })
})

describe('HABIT_GROUPS', () => {
  it('exposes the curated grouping constant', () => {
    expect(HABIT_GROUPS['Eating out']).toContain('biryani')
    expect(HABIT_GROUPS.Groceries).toContain('blink it')
  })
})
