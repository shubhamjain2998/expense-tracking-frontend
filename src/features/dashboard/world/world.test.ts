import type { SummaryRow } from '@/types/dashboard'

import { cameraAt, fitZoom, progressFromCenters, type StationFrame } from './cameraPath'
import { buildTowers, buildTrend, buildVessel } from './stationData'

function row(category: string, actual: number, allocated: number): SummaryRow {
  return { category, actual, allocated_monthly: allocated, variance: 0, pct_used: null }
}

const A: StationFrame = { center: [0, 1, 0], size: [10, 2, 2], view: [0, 0, 1] }
const B: StationFrame = { center: [40, 3, 0], size: [4, 4, 4], view: [1, 0, 0] }

describe('cameraPath', () => {
  it('fits the wider of the two projected extents', () => {
    // Looking straight down z: a 10×2 face in a 1000×1000 stage fills width.
    expect(fitZoom(A, 1000, 1000)).toBeCloseTo((1000 * 0.84) / 10)
    // In a short stage the height binds instead.
    expect(fitZoom(A, 1000, 100)).toBeCloseTo((100 * 0.84) / 2)
  })

  it('sits on each station at whole t and blends between', () => {
    const at0 = cameraAt(0, [A, B], 800, 600)
    expect(at0.target).toEqual([0, 1, 0])
    expect(at0.position[2]).toBeCloseTo(40)

    const at1 = cameraAt(1, [A, B], 800, 600)
    expect(at1.target).toEqual([40, 3, 0])
    expect(at1.position[0]).toBeCloseTo(80)

    const mid = cameraAt(0.5, [A, B], 800, 600)
    expect(mid.target).toEqual([20, 2, 0])
    expect(mid.zoom).toBeGreaterThan(Math.min(at0.zoom, at1.zoom))
    expect(mid.zoom).toBeLessThan(Math.max(at0.zoom, at1.zoom))
  })

  it('clamps t past either end', () => {
    expect(cameraAt(-3, [A, B], 800, 600).target).toEqual(A.center)
    expect(cameraAt(9, [A, B], 800, 600).target).toEqual(B.center)
  })

  it('reads progress from where the panels sit', () => {
    const centers = [100, 300, 700]
    expect(progressFromCenters(centers, 50)).toBe(0)
    expect(progressFromCenters(centers, 200)).toBe(0.5)
    expect(progressFromCenters(centers, 500)).toBe(1.5)
    expect(progressFromCenters(centers, 900)).toBe(2)
    expect(progressFromCenters([], 10)).toBe(0)
  })
})

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
