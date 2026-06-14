import type { ProcessedTransactionItem } from '@/types/transaction'

import { computeSeasonality, daysInMonth, monthlyExpenseSeries } from './seasonality'

// ── fixture helper ───────────────────────────────────────────────────────────

let idCounter = 0

function txn(
  partial: Partial<ProcessedTransactionItem> & { txn_date: string; effective_amount: string }
): ProcessedTransactionItem {
  const date = partial.txn_date
  const [y, m] = date.split('-').map(Number)
  return {
    id: `t${idCounter++}`,
    raw_txn_id: `r${idCounter}`,
    mapping_id: null,
    category_id: 'c1',
    category: partial.category ?? 'Misc',
    txn_date: date,
    description: partial.description ?? 'item',
    amount: partial.amount ?? partial.effective_amount,
    effective_amount: partial.effective_amount,
    month: m,
    year: y,
    notes: null,
    txn_type: partial.txn_type ?? 'expense',
    shares: [],
    tags: [],
  }
}

// ── monthlyExpenseSeries ─────────────────────────────────────────────────────

describe('monthlyExpenseSeries', () => {
  it('aggregates expenses per calendar month, chronological', () => {
    const series = monthlyExpenseSeries([
      txn({ txn_date: '2026-03-05', effective_amount: '100' }),
      txn({ txn_date: '2026-03-20', effective_amount: '50' }),
      txn({ txn_date: '2026-01-10', effective_amount: '30' }),
    ])
    expect(series.map((s) => `${s.year}-${s.month}:${s.expense}`)).toEqual([
      '2026-1:30',
      '2026-3:150',
    ])
    expect(series[1].label).toBe('Mar')
  })

  it('ignores non-expense txns and uses absolute amount', () => {
    const series = monthlyExpenseSeries([
      txn({ txn_date: '2026-02-01', effective_amount: '-200' }), // expense, abs => 200
      txn({ txn_date: '2026-02-02', effective_amount: '500', txn_type: 'income' }),
      txn({ txn_date: '2026-02-03', effective_amount: '40', txn_type: 'refund' }),
    ])
    expect(series).toHaveLength(1)
    expect(series[0].expense).toBe(200)
  })
})

describe('daysInMonth', () => {
  it('handles leap and non-leap February', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

// ── computeSeasonality ───────────────────────────────────────────────────────

describe('computeSeasonality', () => {
  it('empty input → safe zeros/nulls and months:[]', () => {
    const r = computeSeasonality([], new Date(2026, 5, 14))
    expect(r.months).toEqual([])
    expect(r.mean).toBe(0)
    expect(r.peak).toBeNull()
    expect(r.calmest).toBeNull()
    expect(r.currentVsLastMonthPct).toBeNull()
    expect(r.currentVsSameMonthLastYearPct).toBeNull()
    expect(r.heaviestDays).toEqual([])
    expect(r.projectedThisMonth).toBe(0)
    expect(r.projectedFY).toBe(0)
    expect(r.dayOfWeek.map((d) => d.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
  })

  it('peak/calmest exclude the in-progress current month', () => {
    // now = June 2026; June spend is highest but partial, must be excluded.
    const txns = [
      txn({ txn_date: '2026-04-10', effective_amount: '300' }), // Apr peak among completed
      txn({ txn_date: '2026-05-10', effective_amount: '100' }), // May calmest
      txn({ txn_date: '2026-06-02', effective_amount: '9999' }), // current partial, excluded
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 5)) // month index 5 = June
    expect(r.months.map((m) => `${m.month}`)).toEqual(['4', '5', '6']) // June still present
    expect(r.peak?.month).toBe(4)
    expect(r.calmest?.month).toBe(5)
  })

  it('only current month exists → peak/calmest null', () => {
    const r = computeSeasonality(
      [txn({ txn_date: '2026-06-03', effective_amount: '500' })],
      new Date(2026, 5, 10)
    )
    expect(r.months).toHaveLength(1)
    expect(r.peak).toBeNull()
    expect(r.calmest).toBeNull()
  })

  it('currentVsLastMonthPct sign: positive when current > prev', () => {
    const txns = [
      txn({ txn_date: '2026-05-10', effective_amount: '100' }),
      txn({ txn_date: '2026-06-05', effective_amount: '150' }),
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 6))
    expect(r.currentVsLastMonthPct).toBeCloseTo(0.5, 6)
  })

  it('currentVsLastMonthPct sign: negative when current < prev', () => {
    const txns = [
      txn({ txn_date: '2026-05-10', effective_amount: '200' }),
      txn({ txn_date: '2026-06-05', effective_amount: '100' }),
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 6))
    expect(r.currentVsLastMonthPct).toBeCloseTo(-0.5, 6)
  })

  it('currentVsLastMonthPct null when previous month missing/zero', () => {
    const txns = [txn({ txn_date: '2026-06-05', effective_amount: '100' })]
    const r = computeSeasonality(txns, new Date(2026, 5, 6))
    expect(r.currentVsLastMonthPct).toBeNull()
  })

  it('currentVsSameMonthLastYearPct compares same calendar month a year earlier', () => {
    const txns = [
      txn({ txn_date: '2025-06-10', effective_amount: '100' }),
      txn({ txn_date: '2026-06-05', effective_amount: '120' }),
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 6))
    expect(r.currentVsSameMonthLastYearPct).toBeCloseTo(0.2, 6)
  })

  it('dayOfWeek sums land on the correct weekday', () => {
    // 2026-06-01 is a Monday; 2026-06-06 is a Saturday.
    const txns = [
      txn({ txn_date: '2026-06-01', effective_amount: '10' }), // Mon
      txn({ txn_date: '2026-06-08', effective_amount: '5' }), // Mon
      txn({ txn_date: '2026-06-06', effective_amount: '40' }), // Sat
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 9))
    const map = Object.fromEntries(r.dayOfWeek.map((d) => [d.label, d.total]))
    expect(map.Mon).toBe(15)
    expect(map.Sat).toBe(40)
    expect(map.Sun).toBe(0)
    expect(r.heaviestDays).toEqual(['Sat', 'Mon'])
  })

  it('projectedThisMonth is a run-rate over the month', () => {
    // now = 2026-06-10, June has 30 days. MTD spend = 100 over 10 days.
    const txns = [
      txn({ txn_date: '2026-06-02', effective_amount: '60' }),
      txn({ txn_date: '2026-06-08', effective_amount: '40' }),
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 10))
    // 100 / 10 * 30 = 300
    expect(r.projectedThisMonth).toBeCloseTo(300, 6)
  })

  it('projectedThisMonth is 0 when current month has no spend', () => {
    const txns = [txn({ txn_date: '2026-05-10', effective_amount: '100' })]
    const r = computeSeasonality(txns, new Date(2026, 5, 10))
    expect(r.projectedThisMonth).toBe(0)
  })

  it('uses opts.projectedFY when provided', () => {
    const r = computeSeasonality(
      [txn({ txn_date: '2026-06-01', effective_amount: '100' })],
      new Date(2026, 5, 10),
      { projectedFY: 123456 }
    )
    expect(r.projectedFY).toBe(123456)
  })

  it('falls back to a trailing-run-rate projectedFY when not provided', () => {
    // Two months, 100 + 200 = 300 over 2 covered months → (300/2)*12 = 1800.
    const txns = [
      txn({ txn_date: '2026-05-10', effective_amount: '100' }),
      txn({ txn_date: '2026-06-05', effective_amount: '200' }),
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 6))
    expect(r.projectedFY).toBeCloseTo(1800, 6)
  })

  it('default window caps months to last 15', () => {
    const txns = Array.from({ length: 20 }, (_, i) => {
      const year = 2024 + Math.floor(i / 12)
      const month = (i % 12) + 1
      return txn({
        txn_date: `${year}-${String(month).padStart(2, '0')}-05`,
        effective_amount: '10',
      })
    })
    const r = computeSeasonality(txns, new Date(2026, 5, 10))
    expect(r.months).toHaveLength(15)
  })

  it('monthsWindow builds a dense trailing window with zero-filled gaps', () => {
    const txns = [
      txn({ txn_date: '2026-04-10', effective_amount: '100' }),
      txn({ txn_date: '2026-06-05', effective_amount: '200' }), // May missing
    ]
    const r = computeSeasonality(txns, new Date(2026, 5, 6), { monthsWindow: 3 })
    expect(r.months.map((m) => `${m.month}:${m.expense}`)).toEqual(['4:100', '5:0', '6:200'])
  })
})
