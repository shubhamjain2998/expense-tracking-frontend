import type { InsightsAggregates } from './insightsAggregates'
import { buildAnonymizeMap } from './insightsAnonymize'
import { buildInsightsPrompt } from './insightsPrompt'
import { INSIGHTS_SCHEMA_VERSION } from './insightsResponseSchema'

function baseData(overrides: Partial<InsightsAggregates> = {}): InsightsAggregates {
  return {
    periodStart: '2025-04-01',
    periodEnd: '2026-06-30',
    monthsCovered: 15,
    categoryMonthTotals: [{ category: 'Dining', month: '2026-06', total: 9900 }],
    incomeBySource: [{ category: 'Salary', total: 90000 }],
    commitments: [
      {
        name: 'Rent',
        category: 'Housing',
        cadence: 'monthly',
        monthlyAmount: 20000,
        medianCharge: 20000,
        monthsSeen: 12,
      },
    ],
    splitLedger: [{ person: 'Alex', theyOweYou: 400 }],
    topTransactions: [
      { date: '2026-06-10', description: 'Big Bazaar', category: 'Groceries', amount: 5000 },
    ],
    outliers: [
      {
        category: 'Dining',
        description: 'Fancy dinner',
        date: '2026-06-12',
        amount: 5000,
        categoryMedian: 900,
      },
    ],
    ...overrides,
  }
}

describe('buildInsightsPrompt', () => {
  it('embeds the real numbers from the aggregates', () => {
    const prompt = buildInsightsPrompt(baseData(), { anonymize: false, anonymizeMap: null })
    expect(prompt).toContain('Dining')
    expect(prompt).toContain('Rent')
    expect(prompt).toContain('Alex')
    expect(prompt).toContain('Big Bazaar')
    expect(prompt).toContain('2025-04-01')
    expect(prompt).toContain('2026-06-30')
  })

  it('states the exact schema version and demands JSON-only fenced output', () => {
    const prompt = buildInsightsPrompt(baseData(), { anonymize: false, anonymizeMap: null })
    expect(prompt).toContain(`"schema_version" must be exactly ${INSIGHTS_SCHEMA_VERSION}`)
    expect(prompt).toContain('```json')
    expect(prompt).toContain('JSON ONLY')
  })

  it('includes a worked example response', () => {
    const prompt = buildInsightsPrompt(baseData(), { anonymize: false, anonymizeMap: null })
    expect(prompt).toContain('"verdict"')
    expect(prompt).toContain('"findings"')
    expect(prompt).toContain('"charts"')
  })

  it('swaps merchant names for stable labels when anonymize is on', () => {
    const data = baseData()
    const map = buildAnonymizeMap([
      ...data.topTransactions.map((t) => t.description),
      ...data.outliers.map((o) => o.description),
    ])
    const prompt = buildInsightsPrompt(data, { anonymize: true, anonymizeMap: map })
    expect(prompt).not.toContain('Big Bazaar')
    expect(prompt).toContain('MERCHANT_01')
  })

  it('never anonymises categories, dates or amounts', () => {
    const data = baseData()
    const map = buildAnonymizeMap(data.topTransactions.map((t) => t.description))
    const prompt = buildInsightsPrompt(data, { anonymize: true, anonymizeMap: map })
    expect(prompt).toContain('Groceries')
    expect(prompt).toContain('2026-06-10')
  })

  it('handles empty sections without throwing', () => {
    const empty = baseData({
      categoryMonthTotals: [],
      incomeBySource: [],
      commitments: [],
      splitLedger: [],
      topTransactions: [],
      outliers: [],
    })
    const prompt = buildInsightsPrompt(empty, { anonymize: false, anonymizeMap: null })
    expect(prompt).toContain('none detected')
    expect(prompt).toContain('nothing outstanding')
  })
})
