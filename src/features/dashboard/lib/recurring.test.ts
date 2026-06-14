import { describe, expect, it } from 'vitest'

import type { ProcessedTransactionItem } from '@/types/transaction'

import { detectRecurring, normalizeDescription } from './recurring'

// ── Fixture helper ───────────────────────────────────────────────────────────

let idCounter = 0

function txn(
  overrides: Partial<ProcessedTransactionItem> & {
    txn_date: string
    effective_amount: string
  }
): ProcessedTransactionItem {
  idCounter += 1
  return {
    id: `txn-${idCounter}`,
    raw_txn_id: `raw-${idCounter}`,
    mapping_id: null,
    category_id: 'cat-1',
    category: 'Housing',
    description: 'Some charge',
    amount: overrides.effective_amount,
    month: 1,
    year: 2026,
    notes: null,
    txn_type: 'expense',
    shares: [],
    tags: [],
    ...overrides,
  } as ProcessedTransactionItem
}

const NOW = new Date('2026-06-14T00:00:00Z')

describe('normalizeDescription', () => {
  it('collapses drifted rent descriptions to the same key', () => {
    const a = normalizeDescription('Rent')
    const b = normalizeDescription('Rent payment')
    const c = normalizeDescription('RENT - APR')
    const d = normalizeDescription('Rent  12345')
    expect(a).toBe('rent')
    expect(b).toBe('rent')
    expect(c).toBe('rent')
    expect(d).toBe('rent')
  })

  it('strips long digit runs and reference codes', () => {
    expect(normalizeDescription('Netflix ref:9988776655')).toBe('netflix')
    expect(normalizeDescription('SIP txn id 5567812')).toBe('sip')
  })
})

describe('detectRecurring', () => {
  it('returns empty result for empty input without throwing', () => {
    expect(detectRecurring([], NOW)).toEqual({
      commitments: [],
      lockedInPerMonth: 0,
      pctOfAvgMonth: 0,
    })
  })

  it('collapses description-drift into ONE commitment across 7 months', () => {
    // Same rent under varied descriptions, one per month Dec 2025 → Jun 2026.
    const descs = [
      'Rent',
      'Rent payment',
      'RENT - APR',
      'Rent',
      'Rent 998877',
      'RENT - MAY',
      'Rent payment',
    ]
    const months = [
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
    ]
    const txns = months.map((date, i) =>
      txn({
        txn_date: date,
        effective_amount: '25000',
        description: descs[i],
        category: 'Housing',
      })
    )

    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(1)
    const rent = result.commitments[0]
    expect(rent.monthsSeen).toBe(7)
    expect(rent.medianAmount).toBe(25000)
    expect(rent.cadence).toBe('monthly')
    expect(rent.lastCharged).toBe('2026-06-01')
  })

  it('keys by recurring tag even when descriptions differ wildly', () => {
    const months = [
      '2025-12-05',
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
      '2026-04-05',
      '2026-05-05',
    ]
    const txns = months.map((date, i) =>
      txn({
        txn_date: date,
        effective_amount: '5000',
        description: `Mutual fund purchase ${i}-XYZ${1000 + i}`,
        category: 'Investments',
        tags: [{ id: 't1', name: 'SIP' }],
      })
    )
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(1)
    expect(result.commitments[0].key).toBe('tag:sip')
    expect(result.commitments[0].monthsSeen).toBe(6)
  })

  it('keeps tag-keyed commitments even when amounts are unstable (rent hikes / bundled SIP)', () => {
    // Rent drifts 18k→26k across the year — fails the ±15% stability gate, but
    // the 'rent' tag marks it as known-recurring so it must still be detected.
    const months = [
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
    ]
    const amounts = ['18000', '18000', '19000', '19000', '25000', '25000', '26000']
    const txns = months.map((date, i) =>
      txn({
        txn_date: date,
        effective_amount: amounts[i],
        description: 'Rent',
        category: 'Housing',
        tags: [{ id: 't1', name: 'rent' }],
      })
    )
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(1)
    // monthlyAmount = MEDIAN of per-month totals (one charge per month here) →
    // median of [18000,18000,19000,19000,25000,25000,26000] = 19000.
    expect(result.commitments[0].monthlyAmount).toBe(19000)
    expect(result.lockedInPerMonth).toBe(19000)
  })

  it('counts bundled same-month charges into the monthly committed amount', () => {
    // Two SIP charges every month → monthlyAmount should reflect both, not one.
    const months = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05']
    const txns = months.flatMap((ym) => [
      txn({
        txn_date: `${ym}-05`,
        effective_amount: '5000',
        description: 'SIP fund A',
        tags: [{ id: 't1', name: 'sip' }],
      }),
      txn({
        txn_date: `${ym}-05`,
        effective_amount: '5000',
        description: 'SIP fund B',
        tags: [{ id: 't1', name: 'sip' }],
      }),
    ])
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(1)
    expect(result.commitments[0].monthlyAmount).toBeCloseTo(10000, 5)
  })

  it('reports the median monthly figure, unaffected by sporadic same-tag outliers', () => {
    // A monthly RD (₹5,900) sharing the 'insurance premium' tag with a couple of
    // big one-off annual premiums. The monthly figure must be the RD (₹5,900),
    // NOT inflated by the outliers (the bug: it read ~₹10k, implying 2×/month).
    const base = ['2025-07', '2025-08', '2025-09', '2025-10', '2026-01', '2026-03', '2026-04']
    const txns = base.map((ym) =>
      txn({
        txn_date: `${ym}-05`,
        effective_amount: '5900',
        description: 'Insurance RD',
        tags: [{ id: 't1', name: 'insurance premium' }],
      })
    )
    // Two months carry an extra big annual premium on top of the RD.
    txns.push(
      txn({
        txn_date: '2025-12-05',
        effective_amount: '5900',
        description: 'Insurance RD',
        tags: [{ id: 't1', name: 'insurance premium' }],
      }),
      txn({
        txn_date: '2025-12-20',
        effective_amount: '29000',
        description: 'Life insurance',
        tags: [{ id: 't1', name: 'insurance premium' }],
      })
    )
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(1)
    expect(result.commitments[0].monthlyAmount).toBe(5900)
  })

  it('excludes groups seen in fewer than 6 distinct months', () => {
    const months = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01']
    const txns = months.map((date) =>
      txn({ txn_date: date, effective_amount: '999', description: 'Gym membership' })
    )
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(0)
  })

  it('excludes amount-unstable groups (wildly varying amounts)', () => {
    const months = [
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
    ]
    const amounts = ['100', '5000', '250', '9000', '40', '12000', '300']
    const txns = months.map((date, i) =>
      txn({
        txn_date: date,
        effective_amount: amounts[i],
        description: 'Misc shopping',
      })
    )
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(0)
  })

  it("sets 'due' flag when nextExpected falls within 3 days of now", () => {
    // Monthly charges on the 16th; last on May 16 → next ≈ Jun 15 (within 3d of Jun 14).
    const months = [
      '2025-12-16',
      '2026-01-16',
      '2026-02-16',
      '2026-03-16',
      '2026-04-16',
      '2026-05-16',
    ]
    const txns = months.map((date) =>
      txn({ txn_date: date, effective_amount: '799', description: 'Netflix' })
    )
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(1)
    expect(result.commitments[0].flags).toContain('due')
  })

  it("sets 'changed' flag when the latest COMPLETED month jumps >25%", () => {
    // The jump must land in a completed month (May) — the in-progress current
    // month (June, per NOW) is excluded from the change comparison.
    const months = [
      '2025-11-10',
      '2025-12-10',
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
      '2026-04-10',
      '2026-05-10',
    ]
    const amounts = ['1000', '1000', '1000', '1000', '1000', '1000', '2000']
    const txns = months.map((date, i) =>
      txn({ txn_date: date, effective_amount: amounts[i], description: 'Spotify' })
    )
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(1)
    expect(result.commitments[0].flags).toContain('changed')
  })

  it('sums monthly commitment medians into lockedInPerMonth', () => {
    const mk = (desc: string, amt: string, dayTag: string) =>
      ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'].map((ym) =>
        txn({
          txn_date: `${ym}-${dayTag}`,
          effective_amount: amt,
          description: desc,
        })
      )
    const txns = [...mk('Rent', '20000', '01'), ...mk('Netflix', '800', '05')]
    const result = detectRecurring(txns, NOW)
    expect(result.commitments).toHaveLength(2)
    // Sorted by medianAmount desc.
    expect(result.commitments[0].name).toBe('Rent')
    expect(result.lockedInPerMonth).toBe(20800)
    // commitments are monthly, so pctOfAvgMonth = locked / avg monthly spend.
    expect(result.pctOfAvgMonth).toBeCloseTo(1, 5) // only recurring spend exists
  })

  it('ignores non-expense transactions', () => {
    const months = [
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
    ]
    const txns = months.map((date) =>
      txn({
        txn_date: date,
        effective_amount: '5000',
        description: 'Salary',
        txn_type: 'income',
      })
    )
    expect(detectRecurring(txns, NOW).commitments).toHaveLength(0)
  })
})
