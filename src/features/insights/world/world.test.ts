import { stationX } from '@/components/world/cameraPath'

import type { InsightsAggregates } from '../lib/insightsAggregates'
import type { InsightsFinding } from '../lib/insightsResponseSchema'

import {
  BEAM,
  beamLabels,
  beamTip,
  clip,
  ringLabels,
  ringXZ,
  slabHeight,
  slabLabels,
  SLAB,
  slabTip,
} from './layout'
import {
  buildBeams,
  buildMetricTokens,
  buildMonthRing,
  buildPlates,
  buildSlabs,
} from './stationData'

function aggregates(over: Partial<InsightsAggregates> = {}): InsightsAggregates {
  return {
    periodStart: '2025-04-01',
    periodEnd: '2026-06-30',
    monthsCovered: 15,
    categoryMonthTotals: [],
    incomeBySource: [],
    incomeByMonth: [],
    weekdayTotals: [],
    commitments: [],
    splitLedger: [],
    topTransactions: [],
    outliers: [],
    ...over,
  }
}

function finding(id: string, severity: InsightsFinding['severity'], impact?: number) {
  return {
    id,
    title: `Finding ${id}`,
    severity,
    detail: '',
    so_what: '',
    annual_impact: impact,
  } as InsightsFinding
}

describe('insights world · stationData', () => {
  it('lays the prompt window on rings, a year apart per spoke', () => {
    const ring = buildMonthRing(
      aggregates({
        categoryMonthTotals: [
          { category: 'Food', month: '2025-06', total: 300, count: 3 },
          { category: 'Rent', month: '2025-06', total: 700, count: 1 },
          { category: 'Food', month: '2026-06', total: 900, count: 4 },
        ],
        incomeByMonth: [
          { month: '2025-06', total: 1500 },
          { month: '2026-06', total: 800 },
        ],
      })
    )
    expect(ring.months).toHaveLength(15)
    expect(ring.rings).toBe(2)
    expect(ring.max).toBe(1500)
    const first = ring.months[0]
    expect(first).toMatchObject({ key: '2025-04', calMonth: 4, year: 2025, ring: 1 })
    const lastJune = ring.months.find((m) => m.key === '2025-06')
    const thisJune = ring.months.find((m) => m.key === '2026-06')
    // Categories sum into one month; last June sits one ring inside this one.
    expect(lastJune).toMatchObject({ spent: 1000, income: 1500, over: false, ring: 1 })
    expect(thisJune).toMatchObject({ spent: 900, income: 800, over: true, ring: 0 })
    // The outer ring is exactly the latest twelve months.
    expect(ring.months.filter((m) => m.ring === 0).map((m) => m.key)[0]).toBe('2025-07')
  })

  it('returns an empty ring for an empty window', () => {
    expect(buildMonthRing(aggregates({ monthsCovered: 0 }))).toEqual({
      months: [],
      rings: 0,
      max: 0,
    })
  })

  it('maps metric tone to colour without inventing one', () => {
    const tokens = buildMetricTokens([
      { id: 'a', label: 'A', value: 1, detail: '', tone: 'positive', direction: 'up' },
      { id: 'b', label: 'B', value: 2, detail: '', tone: 'negative' },
      { id: 'c', label: 'C', value: 3, detail: '' },
    ])
    expect(tokens.map((t) => [t.tone, t.direction])).toEqual([
      ['pos', 'up'],
      ['neg', null],
      ['plain', null],
    ])
  })

  it('keeps every finding in list order, flat when it has no yearly figure', () => {
    const model = buildSlabs([
      finding('a', 'warning', 20000),
      finding('b', 'good', -50000),
      finding('c', 'info'),
    ])
    expect(model.slabs.map((s) => [s.id, s.amount, s.tone])).toEqual([
      ['a', 20000, 'neg'],
      ['b', 50000, 'pos'],
      ['c', 0, 'plain'],
    ])
    expect(model.max).toBe(50000)
    expect(slabHeight(model, 50000)).toBe(SLAB.height)
    expect(slabHeight(model, 0)).toBe(SLAB.floor)
  })

  it('stacks patterns in list order', () => {
    expect(buildPlates([{ id: 'p', title: 'P', detail: '' }])).toEqual([{ id: 'p', title: 'P' }])
  })

  it('balances each person against the largest balance, in table order', () => {
    const model = buildBeams([
      { person_name: 'Asha', total_split_amount: '500' },
      { person_name: 'Ravi', total_split_amount: '0' },
      { person_name: 'Mira', total_split_amount: '2000' },
    ])
    expect(model.max).toBe(2000)
    expect(model.beams.map((b) => [b.person, b.tilt, b.youOweThem])).toEqual([
      ['Asha', 0.25, 0],
      ['Mira', 1, 0],
    ])
  })
})

describe('insights world · layout', () => {
  it('puts January at the back and runs clockwise from above', () => {
    const [x1, z1] = ringXZ(0, 1, 0)
    const [x4, z4] = ringXZ(0, 4, 0)
    expect(x1).toBeCloseTo(stationX(0))
    expect(z1).toBeLessThan(0)
    expect(x4).toBeGreaterThan(stationX(0))
    expect(z4).toBeCloseTo(0)
    // An inner ring shares the spoke, closer in.
    expect(Math.abs(ringXZ(0, 1, 1)[1])).toBeLessThan(Math.abs(z1))
  })

  it('marks the latest month on the ring', () => {
    const ring = buildMonthRing(aggregates())
    const current = ringLabels(0, ring).filter((l) => l.tone === 'current')
    expect(current.map((l) => l.text)).toEqual(['Jun'])
  })

  it('labels only slabs that carry a figure, and tips every one', () => {
    const model = buildSlabs([finding('a', 'critical', 120000), finding('b', 'info')])
    expect(slabLabels(1, model).map((l) => l.text)).toEqual(['₹1.2L'])
    expect(slabTip(1, model, 1)?.lines[0]).toBe('No yearly figure')
    expect(slabTip(1, model, 5)).toBeNull()
  })

  it('tips the heavier end of a beam down', () => {
    const model = buildBeams([{ person_name: 'Mira', total_split_amount: '2000' }])
    const labels = beamLabels(3, model)
    const name = labels.find((l) => l.key === 'p-n0')
    const amount = labels.find((l) => l.key === 'p-a0')
    expect(amount?.anchor[1]).toBeLessThan(BEAM.pivot)
    expect(name?.anchor[1]).toBeGreaterThan(BEAM.pivot)
    expect(beamTip(3, model, 0)?.lines).toEqual(['They owe you: ₹2,000', 'You owe them: ₹0'])
  })

  it('clips long titles', () => {
    expect(clip('short')).toBe('short')
    expect(clip('a'.repeat(40), 10)).toHaveLength(10)
  })
})
