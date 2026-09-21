import {
  anonymizeText,
  buildAnonymizeMap,
  deanonymizeInsightsPayload,
  deanonymizeText,
  loadAnonymizeMap,
  mergeAnonymizeMap,
  saveAnonymizeMap,
} from './insightsAnonymize'
import type { InsightsPayload } from './insightsResponseSchema'

describe('insightsAnonymize', () => {
  it('assigns stable, distinct labels to each unique description', () => {
    const map = buildAnonymizeMap(['Zomato', 'Swiggy', 'Zomato'])
    expect(map.forward.Zomato).toBe('MERCHANT_01')
    expect(map.forward.Swiggy).toBe('MERCHANT_02')
    expect(Object.keys(map.forward)).toHaveLength(2)
  })

  it('round-trips forward then reverse back to the real name', () => {
    const map = buildAnonymizeMap(['Zomato'])
    const anonymized = anonymizeText('Zomato', map)
    expect(anonymized).toBe('MERCHANT_01')
    expect(deanonymizeText(anonymized, map)).toBe('Zomato')
  })

  it('deanonymizes every MERCHANT_NN occurrence embedded in free text', () => {
    const map = buildAnonymizeMap(['Zomato', 'Swiggy'])
    const llmText = 'Your spend at MERCHANT_01 outpaced MERCHANT_02 by 20%.'
    expect(deanonymizeText(llmText, map)).toBe('Your spend at Zomato outpaced Swiggy by 20%.')
  })

  it('leaves unknown text unchanged', () => {
    const map = buildAnonymizeMap(['Zomato'])
    expect(anonymizeText('Uber', map)).toBe('Uber')
    expect(deanonymizeText('no labels here', map)).toBe('no labels here')
  })

  it('persists and reloads via localStorage', () => {
    const map = buildAnonymizeMap(['Zomato'])
    saveAnonymizeMap(map)
    expect(loadAnonymizeMap()).toEqual(map)
  })

  it('returns null when nothing is stored', () => {
    localStorage.clear()
    expect(loadAnonymizeMap()).toBeNull()
  })

  describe('mergeAnonymizeMap', () => {
    it('builds a fresh map when there is no existing one', () => {
      const merged = mergeAnonymizeMap(null, ['Zomato', 'Swiggy'])
      expect(merged.forward.Zomato).toBe('MERCHANT_01')
      expect(merged.forward.Swiggy).toBe('MERCHANT_02')
    })

    it('keeps previously assigned labels stable and numbers new ones after them', () => {
      const existing = buildAnonymizeMap(['Zomato'])
      const merged = mergeAnonymizeMap(existing, ['Zomato', 'Swiggy'])
      expect(merged.forward.Zomato).toBe('MERCHANT_01')
      expect(merged.forward.Swiggy).toBe('MERCHANT_02')
    })

    it('does not duplicate a label for a description already mapped', () => {
      const existing = buildAnonymizeMap(['Zomato', 'Swiggy'])
      const merged = mergeAnonymizeMap(existing, ['Swiggy'])
      expect(Object.keys(merged.forward)).toHaveLength(2)
      expect(merged.forward.Swiggy).toBe('MERCHANT_02')
    })
  })

  describe('deanonymizeInsightsPayload', () => {
    const map = buildAnonymizeMap(['Zomato'])
    const payload: InsightsPayload = {
      schema_version: 1,
      verdict: 'MERCHANT_01 dominates your dining spend.',
      findings: [
        {
          id: 'f1',
          title: 'MERCHANT_01 is your top merchant',
          severity: 'info',
          detail: 'You visited MERCHANT_01 12 times.',
          figure: { label: 'Spend at MERCHANT_01', value: 4000 },
        },
      ],
      charts: [
        {
          id: 'c1',
          title: 'Spend by merchant',
          type: 'bar',
          series: [{ name: 'MERCHANT_01', data: [{ label: 'MERCHANT_01', value: 4000 }] }],
        },
      ],
    }

    it('reverses every MERCHANT_NN occurrence back to the real name', () => {
      const real = deanonymizeInsightsPayload(payload, map)
      expect(real.verdict).toBe('Zomato dominates your dining spend.')
      expect(real.findings[0].title).toBe('Zomato is your top merchant')
      expect(real.findings[0].detail).toBe('You visited Zomato 12 times.')
      expect(real.findings[0].figure?.label).toBe('Spend at Zomato')
      expect(real.charts[0].series[0].name).toBe('Zomato')
      expect(real.charts[0].series[0].data[0].label).toBe('Zomato')
    })

    it('is a no-op when there is no map (anonymisation was off)', () => {
      expect(deanonymizeInsightsPayload(payload, null)).toEqual(payload)
    })
  })
})
