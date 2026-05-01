import type { PersonShareIn } from '@/types/transaction'

import { getEffectiveAmount } from './shareMath'

function pct(value: number): PersonShareIn {
  return { person_id: 'p1', share_type: 'percentage', share_value: value }
}

function amt(value: number): PersonShareIn {
  return { person_id: 'p1', share_type: 'amount', share_value: value }
}

describe('getEffectiveAmount', () => {
  it('returns total unchanged when shares list is empty', () => {
    expect(getEffectiveAmount(1000, [])).toBe(1000)
  })

  it('50% share of 1000 leaves 500', () => {
    expect(getEffectiveAmount(1000, [pct(50)])).toBe(500)
  })

  it('two 30% shares leave 400', () => {
    const shares: PersonShareIn[] = [
      { person_id: 'p1', share_type: 'percentage', share_value: 30 },
      { person_id: 'p2', share_type: 'percentage', share_value: 30 },
    ]
    expect(getEffectiveAmount(1000, shares)).toBe(400)
  })

  it('one ₹200 fixed share of 1000 leaves 800', () => {
    expect(getEffectiveAmount(1000, [amt(200)])).toBe(800)
  })

  it('mixed: 50% + ₹100 of 1000 leaves 400', () => {
    const shares: PersonShareIn[] = [
      { person_id: 'p1', share_type: 'percentage', share_value: 50 },
      { person_id: 'p2', share_type: 'amount', share_value: 100 },
    ]
    expect(getEffectiveAmount(1000, shares)).toBe(400)
  })

  it('100% share leaves 0', () => {
    expect(getEffectiveAmount(1000, [pct(100)])).toBe(0)
  })

  it('fixed share equal to total leaves 0', () => {
    expect(getEffectiveAmount(500, [amt(500)])).toBe(0)
  })
})
