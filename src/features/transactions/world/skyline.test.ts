import type { UnifiedTxn } from '../types'

import { buildSkyline, dayHeight, dayX, SKYLINE, skylineLabels, skylineTip } from './skyline'

function txn(
  txn_date: string,
  amount: number,
  kind: UnifiedTxn['kind'],
  txnType?: UnifiedTxn['txnType']
): UnifiedTxn {
  return {
    uid: `${kind}-${txn_date}-${amount}`,
    txn_date,
    description: 'x',
    amount: String(amount),
    effectiveAmount: String(amount),
    kind,
    txnType,
    tags: [],
    shares: [],
  }
}

describe('buildSkyline', () => {
  const model = buildSkyline(
    [
      txn('2026-06-11', 500, 'processed', 'expense'),
      txn('2026-06-11', 200, 'pending'),
      // Money in never counts as spend, but still counts as a transaction.
      txn('2026-06-11', -300, 'pending'),
      txn('2026-06-25', 90000, 'processed', 'income'),
      txn('2026-06-12', 50, 'processed', 'refund'),
      txn('2026-06-20', 999, 'deleted'),
      txn('2026-07-01', 100, 'processed', 'expense'),
    ],
    2026,
    6
  )

  it('has one column per calendar day', () => {
    expect(model.days).toHaveLength(30)
    expect(buildSkyline([], 2028, 2).days).toHaveLength(29)
    expect(model.days[10].label).toBe('Thu 11 Jun')
  })

  it('splits spend into processed and pending with the table’s sign rules', () => {
    expect(model.days[10]).toMatchObject({
      processed: 500,
      pending: 200,
      count: 3,
      pendingCount: 2,
    })
    expect(model.days[11]).toMatchObject({ processed: 0, pending: 0, count: 1 })
    expect(model.days[24]).toMatchObject({ processed: 0, count: 1 })
    // Deleted rows and other months are left out.
    expect(model.days[19].count).toBe(0)
    expect(model).toMatchObject({ max: 700, processed: 500, pending: 200 })
  })

  it('scales every day against the busiest one', () => {
    expect(dayHeight(model, 700)).toBe(SKYLINE.height)
    expect(dayHeight(model, 350)).toBe(SKYLINE.height / 2)
    expect(dayHeight(buildSkyline([], 2026, 6), 10)).toBe(0)
  })

  it('spans the columns evenly around the centre', () => {
    const n = model.days.length
    expect(dayX(0, n) + dayX(n - 1, n)).toBeCloseTo(SKYLINE.centerX * 2)
    expect(dayX(n - 1, n) - dayX(0, n)).toBeCloseTo((SKYLINE.span * (n - 1)) / n)
  })

  it('labels the 1st, every 5th and the busiest day', () => {
    const texts = skylineLabels(model).map((l) => l.text)
    expect(texts).toEqual(['1', '5', '10', '15', '20', '25', '30', 'Busiest ₹700'])
    // 31 would crowd 30; 28 stands clear of 25.
    expect(skylineLabels(buildSkyline([], 2026, 7)).map((l) => l.text)).not.toContain('31')
    expect(skylineLabels(buildSkyline([], 2026, 2)).map((l) => l.text)).toContain('28')
  })

  it('tips a day with its split only when something is pending', () => {
    expect(skylineTip(model, 10)).toMatchObject({
      title: 'Thu 11 Jun',
      lines: ['Spent: ₹700', 'Processed: ₹500', 'Pending: ₹200', '3 transactions'],
    })
    expect(skylineTip(model, 0)?.lines).toEqual(['Spent: ₹0', 'No transactions'])
    expect(skylineTip(model, 99)).toBeNull()
  })
})
