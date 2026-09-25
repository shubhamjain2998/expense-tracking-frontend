import type { TrendDataPoint } from '@/types/dashboard'

import { computeYearOutlook } from './yearOutlook'

function month(m: number, expense: number, income: number): TrendDataPoint {
  return { month: m, actual_amount: String(expense), income_amount: String(income) }
}

describe('computeYearOutlook', () => {
  it('projects the rest of the year from the completed months, not the partial one', () => {
    // FY: Apr, May complete; Jun (current) half-spent.
    const data = [month(4, 100, 300), month(5, 300, 300), month(6, 50, 300)]
    const out = computeYearOutlook(data, 'fy', 3, 0.5)

    expect(out.soFar).toEqual({ income: 900, expense: 450, saved: 450, savingsRate: 50 })
    expect(out.monthlyPace).toEqual({ income: 300, expense: 200 })
    // Jun finishes at the pace (200, topping up 150), then 9 more months at 200.
    expect(out.yearEnd?.expense).toBe(450 + 150 + 9 * 200)
    expect(out.yearEnd?.income).toBe(900 + 9 * 300)
  })

  it('keeps a current month that has already passed the pace at what it reached', () => {
    const data = [month(1, 100, 0), month(2, 500, 0)]
    const out = computeYearOutlook(data, 'calendar', 2, 0.2)
    expect(out.yearEnd?.expense).toBe(600 + 10 * 100)
  })

  it('scales the only month up by how far through it we are', () => {
    const data = [month(4, 250, 1000)]
    const out = computeYearOutlook(data, 'fy', 1, 0.25)
    expect(out.monthlyPace).toEqual({ income: 4000, expense: 1000 })
  })

  it('joins the projected line to the last actual point', () => {
    const data = [month(1, 100, 0), month(2, 100, 0), month(3, 100, 0)]
    const { points } = computeYearOutlook(data, 'calendar', 3, 1)
    expect(points[1].outProjected).toBeNull()
    expect(points[2].outActual).toBe(300)
    expect(points[2].outProjected).toBe(300)
    expect(points[3].outActual).toBeNull()
    expect(points[3].outProjected).toBe(400)
    expect(points[11].outProjected).toBe(1200)
  })

  it('has nothing to project for a finished or unstarted year', () => {
    const data = [month(1, 100, 200)]
    expect(computeYearOutlook(data, 'calendar', 12, 1).yearEnd).toBeNull()
    expect(computeYearOutlook(data, 'calendar', 0, 1).yearEnd).toBeNull()
    expect(computeYearOutlook(data, 'calendar', 0, 1).soFar.expense).toBe(0)
  })

  it('labels FY months from April', () => {
    const { points } = computeYearOutlook([], 'fy', 1, 1)
    expect(points[0].label).toBe('Apr')
    expect(points[11].label).toBe('Mar')
  })
})
