import { stationX } from '@/components/world/cameraPath'

import type { CategoryTableRow, IncomeTableRow, UnbudgetedCategoryRow } from '../types'

import {
  budgetStations,
  inflowLabels,
  looseFrame,
  looseXZ,
  planHalfWidth,
  vesselTip,
  yearLabels,
} from './layout'
import {
  buildInflow,
  buildLooseBlocks,
  buildPlanVessels,
  buildYearVessel,
  monthPaceFraction,
  planScale,
} from './stationData'

function row(id: string, monthly: number, spent: number, ytd = spent * 3): CategoryTableRow {
  return {
    id: `e-${id}`,
    categoryId: id,
    categoryName: id,
    colorIndex: 0,
    monthlyBudget: monthly,
    thisMonthSpent: spent,
    ytdSpent: ytd,
    annualBudget: monthly * 12,
    pctUsed: monthly > 0 ? (spent / monthly) * 100 : null,
    hasOverride: false,
  }
}

function loose(id: string, spent: number, ytd: number): UnbudgetedCategoryRow {
  return {
    categoryId: id,
    categoryName: id,
    colorIndex: 0,
    thisMonthSpent: spent,
    ytdSpent: ytd,
    txnCount: 2,
  }
}

describe('stationData', () => {
  it('reads pace like Home: today in the current month, the whole month otherwise', () => {
    const now = new Date(2026, 5, 15)
    expect(monthPaceFraction(2026, 6, now)).toBeCloseTo(15 / 30)
    expect(monthPaceFraction(2026, 5, now)).toBe(1)
  })

  it('fills the year vessel to the plan and spills past it', () => {
    const y = buildYearVessel({ spent: 60, plan: 120, monthsElapsed: 6, projected: 120 })
    expect(y).toMatchObject({ fill: 60, spill: 0, pace: 60, projected: 120, max: 120 })
    const over = buildYearVessel({ spent: 150, plan: 120, monthsElapsed: 9, projected: 200 })
    expect(over).toMatchObject({ fill: 120, spill: 30, pace: 90, max: 200 })
    // Nothing elapsed: no projection to draw.
    expect(buildYearVessel({ spent: 0, plan: 0, monthsElapsed: 0, projected: 0 })).toMatchObject({
      pace: null,
      projected: null,
      max: 0,
    })
  })

  it('keeps the table order, drops income rows and follows the period view', () => {
    const rows = [row('rent', 100, 80), row('salary', 50, 0), row('food', 40, 60)]
    const monthly = buildPlanVessels(rows, new Set(['salary']), 'monthly', 0.5)
    expect(monthly.map((v) => v.key)).toEqual(['rent', 'food'])
    expect(monthly[0]).toMatchObject({ plan: 100, fill: 80, spill: 0, over: false, pace: 50 })
    expect(monthly[1]).toMatchObject({ plan: 40, fill: 40, spill: 20, over: true, pace: 20 })
    const annual = buildPlanVessels(rows, new Set(), 'annual', 0.25)
    expect(annual[0]).toMatchObject({ plan: 1200, spent: 240, pace: 300 })
    // A zero plan has no rim: all spend sits in the fill, no pace mark.
    expect(buildPlanVessels([row('x', 0, 30)], new Set(), 'monthly', 1)[0]).toMatchObject({
      fill: 30,
      spill: 0,
      over: false,
      pace: null,
    })
  })

  it('shares one scale between vessels and loose blocks', () => {
    const vessels = buildPlanVessels([row('rent', 100, 80)], new Set(), 'monthly', 1)
    const blocks = buildLooseBlocks([loose('misc', 30, 500)], 'monthly')
    expect(planScale(vessels, blocks)).toBe(100)
    // Unplanned spend so far this year can outgrow every vessel.
    expect(planScale(vessels, buildLooseBlocks([loose('misc', 30, 500)], 'annual'))).toBe(500)
    expect(planScale([], buildLooseBlocks([loose('misc', 300, 500)], 'monthly'))).toBe(300)
  })

  it('scales inflow on received and expected', () => {
    const rows: IncomeTableRow[] = [
      { categoryId: 'a', categoryName: 'a', perMonth: 900, receivedThisMonth: 500, ytdReceived: 0 },
      {
        categoryId: 'b',
        categoryName: 'b',
        perMonth: null,
        receivedThisMonth: 200,
        ytdReceived: 0,
      },
    ]
    const m = buildInflow(rows)
    expect(m.max).toBe(900)
    expect(m.columns[1].expected).toBeNull()
  })
})

describe('layout', () => {
  it('drops the outside station from the route when it is empty', () => {
    expect(budgetStations(true)).toEqual({ year: 0, plan: 1, outside: 2, income: 3 })
    expect(budgetStations(false)).toEqual({ year: 0, plan: 1, outside: null, income: 2 })
  })

  it('sets loose blocks down off the plan plate, inside their own frame', () => {
    const edge = stationX(1) + planHalfWidth(5)
    const blocks = buildLooseBlocks(
      ['a', 'b', 'c', 'd'].map((k) => loose(k, 10, 10)),
      'monthly'
    )
    const frame = looseFrame(blocks, 5, 100)
    blocks.forEach((_, i) => {
      const [x] = looseXZ(i, blocks.length, 5)
      expect(x).toBeGreaterThan(edge + 1)
      expect(Math.abs(x - frame.center[0])).toBeLessThan(frame.size[0] / 2)
    })
    // The frame takes in the end of the plate.
    expect(frame.center[0] - frame.size[0] / 2).toBeLessThan(edge)
  })

  it('keeps year labels on one side apart', () => {
    const y = buildYearVessel({ spent: 100, plan: 200, monthsElapsed: 6, projected: 200 })
    const labels = yearLabels(y, 0)
    const spent = labels.find((l) => l.key === 'y-spent')
    const proj = labels.find((l) => l.key === 'y-proj')
    const plan = labels.find((l) => l.key === 'y-plan')
    const pace = labels.find((l) => l.key === 'y-pace')
    expect(Math.abs((plan?.anchor[1] ?? 0) - (proj?.anchor[1] ?? 0))).toBeLessThan(0.01)
    expect(spent?.anchor[1]).toBeLessThan(proj?.anchor[1] ?? 0)
    // Pace and spend coincide at 50%: they sit on opposite sides, so no nudge.
    expect(pace?.anchor[1]).toBeCloseTo(spent?.anchor[1] ?? 0)
  })

  it('writes tips from the vessel figures and says when income is empty', () => {
    const vessels = buildPlanVessels([row('food', 40, 60)], new Set(), 'monthly', 0.5)
    expect(vesselTip(vessels, 0, 60, 'monthly', 1)?.lines).toEqual([
      'Spent: ₹60',
      '150% of ₹40',
      'Expected by today: ₹20',
    ])
    expect(vesselTip(vessels, 3, 60, 'monthly', 1)).toBeNull()
    expect(inflowLabels(buildInflow([]), 3).map((l) => l.text)).toEqual([
      'No income categories yet',
    ])
  })
})
