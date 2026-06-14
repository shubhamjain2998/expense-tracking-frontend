import { describe, expect, it } from 'vitest'

import type { SplitLedgerRow, SummaryRow } from '@/types/dashboard'

import type { InsightsInput, RecurringResult, SeasonalityResult, TextPart } from './contracts'
import { computeInsights } from './insights'

// ── Fixture builders ────────────────────────────────────────────────────────

function summaryRow(category: string, allocated_monthly: number, actual: number): SummaryRow {
  return {
    category,
    allocated_monthly,
    actual,
    variance: allocated_monthly - actual,
    pct_used: allocated_monthly > 0 ? actual / allocated_monthly : null,
  }
}

const emptyRecurring: RecurringResult = {
  commitments: [],
  lockedInPerMonth: 0,
  pctOfAvgMonth: 0,
}

const emptySeasonality: SeasonalityResult = {
  months: [],
  mean: 0,
  peak: null,
  calmest: null,
  currentVsLastMonthPct: null,
  currentVsSameMonthLastYearPct: null,
  dayOfWeek: [],
  heaviestDays: [],
  projectedThisMonth: 0,
  projectedFY: 0,
}

function makeInput(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
    summaryRows: [],
    pace: 0.5,
    daysLeftInMonth: 15,
    totalDebit: 0,
    totalBudget: 0,
    totalIncome: 0,
    ledger: [],
    recurring: emptyRecurring,
    seasonality: emptySeasonality,
    avgSavingsRate: null,
    pendingHref: '/transactions',
    ...overrides,
  }
}

/** Flatten TextPart[] into a plain string for assertions. */
function flat(parts: TextPart[]): string {
  return parts.map((p) => p.t).join('')
}

/** The text of the em (emphasised) parts only. */
function emParts(parts: TextPart[]): string[] {
  return parts.filter((p) => p.em).map((p) => p.t)
}

// ── Verdict ─────────────────────────────────────────────────────────────────

describe('verdict — pace', () => {
  it('names the biggest over-pace driver when over pace', () => {
    const input = makeInput({
      summaryRows: [
        summaryRow('Travel', 10000, 9000), // overage = 9000 - 5000 = 4000
        summaryRow('Food', 8000, 5000), // overage = 5000 - 4000 = 1000
      ],
      pace: 0.5,
      totalBudget: 20000,
      totalDebit: 14000, // overPace = 14000 - 10000 = 4000 > 5% of 20000(=1000)
      daysLeftInMonth: 15,
    })
    const { verdict } = computeInsights(input)
    expect(verdict.status).toBe('over')
    expect(verdict.overPaceAmount).toBe(4000)
    expect(emParts(verdict.headline)).toContain('Travel')
    expect(flat(verdict.headline)).toContain('over pace')
  })

  it('uses a positive headline when under pace', () => {
    const input = makeInput({
      summaryRows: [summaryRow('Food', 10000, 2000)],
      pace: 0.5,
      totalBudget: 20000,
      totalDebit: 4000, // overPace = 4000 - 10000 = -6000
      daysLeftInMonth: 10,
    })
    const { verdict } = computeInsights(input)
    expect(verdict.status).toBe('on-track')
    expect(verdict.overPaceAmount).toBe(-6000)
    expect(flat(verdict.headline)).toContain('under pace')
    expect(verdict.allowancePerDay).toBeGreaterThan(0)
  })

  it('watch status when slightly over pace but within 5%', () => {
    const input = makeInput({
      pace: 0.5,
      totalBudget: 20000,
      totalDebit: 10500, // overPace = 500, threshold = 1000
      daysLeftInMonth: 15,
    })
    const { verdict } = computeInsights(input)
    expect(verdict.status).toBe('watch')
  })

  it('falls back to neutral on-track when no budget', () => {
    const input = makeInput({ totalBudget: 0, totalDebit: 5000 })
    const { verdict } = computeInsights(input)
    expect(verdict.status).toBe('on-track')
    expect(verdict.allowancePerDay).toBe(0)
  })
})

// ── budget-blowout ──────────────────────────────────────────────────────────

describe('insights — budget-blowout', () => {
  it('marks over-100% as critical and over-pace as warn', () => {
    const input = makeInput({
      summaryRows: [
        summaryRow('Shopping', 5000, 6000), // ratio 1.2 → critical
        summaryRow('Food', 10000, 6000), // ratio 0.6 but > pace(0.5*10000=5000) → warn
      ],
      pace: 0.5,
      totalBudget: 15000,
      totalDebit: 12000,
    })
    const { insights } = computeInsights(input)
    const blowouts = insights.filter((i) => i.id.startsWith('budget-blowout-'))
    expect(blowouts).toHaveLength(2)
    const shopping = blowouts.find((i) => i.id.includes('Shopping'))!
    const food = blowouts.find((i) => i.id.includes('Food'))!
    expect(shopping.severity).toBe('critical')
    expect(food.severity).toBe('warn')
  })

  it('emits at most the top 2 worst by ratio', () => {
    const input = makeInput({
      summaryRows: [
        summaryRow('A', 1000, 3000), // 3.0
        summaryRow('B', 1000, 2500), // 2.5
        summaryRow('C', 1000, 2000), // 2.0
      ],
      pace: 0.5,
      totalBudget: 3000,
      totalDebit: 7500,
    })
    const { insights } = computeInsights(input)
    const blowouts = insights.filter((i) => i.id.startsWith('budget-blowout-'))
    expect(blowouts).toHaveLength(2)
    expect(blowouts.map((i) => i.id)).toEqual(['budget-blowout-A', 'budget-blowout-B'])
  })

  it('does not fire when under pace and under budget', () => {
    const input = makeInput({
      summaryRows: [summaryRow('Food', 10000, 1000)],
      pace: 0.5,
      totalBudget: 10000,
      totalDebit: 1000,
    })
    const { insights } = computeInsights(input)
    expect(insights.filter((i) => i.id.startsWith('budget-blowout-'))).toHaveLength(0)
  })
})

// ── big-share ───────────────────────────────────────────────────────────────

describe('insights — big-share', () => {
  it('fires at the 30% boundary', () => {
    const input = makeInput({
      summaryRows: [
        summaryRow('Rent', 0, 3000), // 30% exactly
        summaryRow('Food', 0, 2500),
        summaryRow('Misc', 0, 4500),
      ],
      totalDebit: 10000,
    })
    const { insights } = computeInsights(input)
    const share = insights.find((i) => i.id.startsWith('big-share-'))
    expect(share).toBeDefined()
    // Misc is biggest (45%); it should be the one named.
    expect(share!.id).toBe('big-share-Misc')
  })

  it('does not fire below 30%', () => {
    const input = makeInput({
      summaryRows: [
        summaryRow('Rent', 0, 2900),
        summaryRow('Food', 0, 2900),
        summaryRow('Misc', 0, 2900),
        summaryRow('Other', 0, 1300),
      ],
      totalDebit: 10000,
    })
    const { insights } = computeInsights(input)
    expect(insights.filter((i) => i.id.startsWith('big-share-'))).toHaveLength(0)
  })
})

// ── split-owed ──────────────────────────────────────────────────────────────

describe('insights — split-owed', () => {
  it('sums ledger string amounts and names a single ower', () => {
    const input = makeInput({
      ledger: [{ person_name: 'Alex', total_split_amount: '1500.50' } as SplitLedgerRow],
    })
    const { insights } = computeInsights(input)
    const owed = insights.find((i) => i.id === 'split-owed')!
    expect(owed).toBeDefined()
    expect(emParts(owed.text)).toContain('Alex')
  })

  it('aggregates multiple owers into a count', () => {
    const input = makeInput({
      ledger: [
        { person_name: 'Alex', total_split_amount: '1000' } as SplitLedgerRow,
        { person_name: 'Sam', total_split_amount: '500' } as SplitLedgerRow,
      ],
    })
    const { insights } = computeInsights(input)
    const owed = insights.find((i) => i.id === 'split-owed')!
    expect(flat(owed.text)).toContain('2 people')
    // sum = 1500 → ₹1.5k
    expect(emParts(owed.text)).toContain('₹1.5k')
  })

  it('ignores zero / negative balances', () => {
    const input = makeInput({
      ledger: [
        { person_name: 'Alex', total_split_amount: '0' } as SplitLedgerRow,
        { person_name: 'Sam', total_split_amount: '-200' } as SplitLedgerRow,
      ],
    })
    const { insights } = computeInsights(input)
    expect(insights.find((i) => i.id === 'split-owed')).toBeUndefined()
  })
})

// ── defensive / sort ────────────────────────────────────────────────────────

describe('insights — defensive', () => {
  it('does not throw on fully empty input', () => {
    expect(() => computeInsights(makeInput())).not.toThrow()
    const { insights, verdict } = computeInsights(makeInput())
    expect(insights).toEqual([])
    expect(verdict.status).toBe('on-track')
  })

  it('does not throw when totalIncome is 0', () => {
    const input = makeInput({ totalIncome: 0, totalDebit: 5000, totalBudget: 4000 })
    expect(() => computeInsights(input)).not.toThrow()
  })

  it('sorts insights by severity: critical → warn → info → good', () => {
    const input = makeInput({
      summaryRows: [
        summaryRow('Shopping', 5000, 6000), // critical (ratio 1.2)
        summaryRow('Rent', 0, 4000), // big-share info (40%)
      ],
      pace: 0.5,
      totalBudget: 10000,
      totalDebit: 10000,
      totalIncome: 20000, // savings rate 50%
      avgSavingsRate: 0.2, // → good
      recurring: {
        ...emptyRecurring,
        commitments: [
          {
            key: 'netflix',
            name: 'Netflix',
            category: 'OTT',
            medianAmount: 500,
            monthlyAmount: 500,
            monthsSeen: 8,
            cadence: 'monthly',
            lastCharged: '2026-05-10',
            nextExpected: '2026-06-10',
            flags: ['due'],
          },
        ],
      },
    })
    const { insights } = computeInsights(input)
    const order = insights.map((i) => i.severity)
    const rank = { critical: 0, warn: 1, info: 2, good: 3 } as const
    for (let i = 1; i < order.length; i++) {
      expect(rank[order[i]]).toBeGreaterThanOrEqual(rank[order[i - 1]])
    }
    // sanity: we produced at least one of each tier
    expect(order).toContain('critical')
    expect(order).toContain('warn')
    expect(order).toContain('good')
  })
})
