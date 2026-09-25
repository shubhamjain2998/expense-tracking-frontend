import type { SummaryRow } from '@/types/dashboard'

import { buildTowers, buildTrend, buildVessel } from './stationData'

function row(category: string, actual: number, allocated: number): SummaryRow {
  return { category, actual, allocated_monthly: allocated, variance: 0, pct_used: null }
}

describe('stationData', () => {
  it('splits the month into spend inside income, overflow and saved', () => {
    expect(buildVessel({ income: 100, spent: 60, budget: 80, paceAt: 0.5 })).toEqual({
      income: 100,
      spent: 60,
      budget: 80,
      pace: 40,
      inside: 60,
      overflow: 0,
      saved: 40,
      max: 100,
    })
    const over = buildVessel({ income: 100, spent: 130, budget: 0, paceAt: 0.5 })
    expect(over).toMatchObject({ inside: 100, overflow: 30, saved: 0, pace: null, max: 130 })
    // No income recorded: all spend is "inside", nothing overflows.
    expect(buildVessel({ income: 0, spent: 50, budget: 0, paceAt: 1 })).toMatchObject({
      inside: 50,
      overflow: 0,
    })
  })

  it('orders towers like Where it went and drops categories with no spend', () => {
    const towers = buildTowers(
      [row('Rent', 500, 500), row('Food', 900, 600), row('Gym', 0, 100), row('Misc', 50, 0)],
      0.5
    )
    expect(towers.map((t) => t.category)).toEqual(['Food', 'Rent', 'Misc'])
    expect(towers[0]).toMatchObject({ over: true, paceAt: 300 })
    expect(towers[1]).toMatchObject({ over: false, paceAt: 250 })
    expect(towers[2]).toMatchObject({ over: false, paceAt: null })
  })

  it('finds the trend scale and average', () => {
    const t = buildTrend([
      { key: '2026-01', month: 'Jan', income: 300, expense: 100, savings: 200 },
      { key: '2026-02', month: 'Feb', income: 200, expense: 500, savings: -300 },
    ])
    expect(t.max).toBe(500)
    expect(t.avgExpense).toBe(300)
    expect(buildTrend([]).avgExpense).toBeNull()
  })
})
