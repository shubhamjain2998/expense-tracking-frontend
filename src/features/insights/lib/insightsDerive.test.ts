import { formatChange, formatDelta, hasImpact, percentChange, toStakeRows } from './insightsDerive'
import type { InsightsFinding } from './insightsResponseSchema'

function finding(overrides: Partial<InsightsFinding> = {}): InsightsFinding {
  return {
    id: 'f',
    title: 'A finding',
    severity: 'info',
    detail: 'detail',
    so_what: 'consequence',
    ...overrides,
  }
}

describe('percentChange', () => {
  it('computes a plain rise and fall', () => {
    expect(percentChange(432, 619)).toBeCloseTo(43.29, 1)
    expect(percentChange(19, 16)).toBeCloseTo(-15.79, 1)
  })

  it('refuses a zero base rather than reporting Infinity', () => {
    expect(percentChange(0, 500)).toBeNull()
  })

  it('refuses a sign flip, where a percentage misleads', () => {
    // -1,459/mo to +86,928/mo is not "a 6,058% rise" in any useful sense.
    expect(percentChange(-1459, 86928)).toBeNull()
  })

  it('refuses non-finite input', () => {
    expect(percentChange(Number.NaN, 10)).toBeNull()
    expect(percentChange(10, Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('formatDelta', () => {
  it('signs the number and drops decimals on larger moves', () => {
    expect(formatDelta(43.29)).toBe('+43%')
    expect(formatDelta(-15.79)).toBe('-16%')
  })

  it('keeps one decimal where rounding would erase a real move', () => {
    expect(formatDelta(2.4)).toBe('+2.4%')
    expect(formatDelta(-0.6)).toBe('-0.6%')
  })

  it('prints a flat move without a sign', () => {
    expect(formatDelta(0)).toBe('0%')
  })
})

describe('formatChange', () => {
  it('uses a percentage for ordinary moves', () => {
    expect(formatChange(432, 619)).toBe('+43%')
    expect(formatChange(19, 16)).toBe('-16%')
  })

  it('switches to a multiple once the percentage stops informing', () => {
    // 3,400 to 41,000 is "+1106%", which nobody parses. 12x is a fact.
    expect(formatChange(3400, 41000)).toBe('12x')
    expect(formatChange(100, 450)).toBe('4.5x')
  })

  it('keeps shrinkage as a percentage — it cannot run away', () => {
    expect(formatChange(41000, 3400)).toBe('-92%')
  })

  it('returns null where no honest form exists', () => {
    expect(formatChange(0, 500)).toBeNull()
  })
})

describe('hasImpact', () => {
  it('rejects the null the API sends for an absent optional number', () => {
    expect(hasImpact(null)).toBe(false)
    expect(hasImpact(undefined)).toBe(false)
    expect(hasImpact(0)).toBe(false)
    expect(hasImpact(20400)).toBe(true)
  })
})

describe('toStakeRows', () => {
  it('ranks by yearly amount, not by the LLM’s own order', () => {
    const rows = toStakeRows([
      finding({ id: 'dining', title: 'Dining', annual_impact: 20400 }),
      finding({ id: 'housing', title: 'Housing', annual_impact: 117600 }),
    ])
    expect(rows.map((r) => r.id)).toEqual(['housing', 'dining'])
    expect(rows[0].ratio).toBe(1)
    expect(rows[1].ratio).toBeCloseTo(0.173, 2)
  })

  it('sizes a saving and a cost alike — magnitude is what is at stake', () => {
    const rows = toStakeRows([
      finding({ id: 'a', title: 'Cost', annual_impact: 5000 }),
      finding({ id: 'b', title: 'Saving', annual_impact: -5000 }),
    ])
    expect(rows.map((r) => r.amount)).toEqual([5000, 5000])
  })

  it('leaves out good news however large its figure', () => {
    const rows = toStakeRows([
      finding({ id: 'sip', title: 'SIPs never missed', severity: 'good', annual_impact: 240000 }),
      finding({ id: 'dining', title: 'Dining', severity: 'warning', annual_impact: 20400 }),
    ])
    // Reassurance is not something at stake, and ranking it first would send
    // the reader to the one row that asks nothing of them.
    expect(rows.map((r) => r.id)).toEqual(['dining'])
  })

  it('skips findings with nothing to price', () => {
    const rows = toStakeRows([
      finding({ id: 'a', annual_impact: 100 }),
      finding({ id: 'b' }),
      finding({ id: 'c', annual_impact: null as unknown as undefined }),
    ])
    expect(rows.map((r) => r.id)).toEqual(['a'])
  })

  it('returns nothing when no finding carries a figure', () => {
    expect(toStakeRows([finding(), finding({ id: 'b' })])).toEqual([])
  })
})
