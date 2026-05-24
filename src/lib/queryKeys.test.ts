import { QueryClient } from '@tanstack/react-query'

import { clearAllQueries, invalidateDomains, qk } from './queryKeys'

describe('queryKeys (qk)', () => {
  describe('static keys', () => {
    it('auth.all', () => {
      expect(qk.auth.all).toEqual(['auth'])
    })

    it('persons.all', () => {
      expect(qk.persons.all).toEqual(['persons'])
    })

    it('categories.all', () => {
      expect(qk.categories.all).toEqual(['categories'])
    })

    it('tags.all', () => {
      expect(qk.tags.all).toEqual(['tags'])
    })

    it('budget.all', () => {
      expect(qk.budget.all).toEqual(['budget'])
    })

    it('dashboard.all', () => {
      expect(qk.dashboard.all).toEqual(['dashboard'])
    })

    it('transactions.all', () => {
      expect(qk.transactions.all).toEqual(['transactions'])
    })
  })

  describe('budget factory', () => {
    it('byYear includes the year', () => {
      expect(qk.budget.byYear(2025)).toEqual(['budget', 2025])
    })

    it('overrides uses budgetOverrides prefix', () => {
      expect(qk.budget.overrides(2025)).toEqual(['budgetOverrides', 2025])
    })
  })

  describe('dashboard factory', () => {
    it('summary with all args', () => {
      expect(qk.dashboard.summary(2025, 4, 'fy', 'tag-id')).toEqual([
        'dashboard',
        'summary',
        2025,
        4,
        'fy',
        'tag-id',
      ])
    })

    it('summary with optional args omitted passes undefined', () => {
      expect(qk.dashboard.summary(2025, 4)).toEqual([
        'dashboard',
        'summary',
        2025,
        4,
        undefined,
        undefined,
      ])
    })

    it('monthlyTrend shape', () => {
      expect(qk.dashboard.monthlyTrend(2025, 'calendar', 'cat-1', 'tag-1')).toEqual([
        'dashboard',
        'monthlyTrend',
        2025,
        'calendar',
        'cat-1',
        'tag-1',
      ])
    })

    it('splitLedger shape', () => {
      expect(qk.dashboard.splitLedger(2025, 4, false, 'fy')).toEqual([
        'dashboard',
        'splitLedger',
        2025,
        4,
        false,
        'fy',
      ])
    })

    it('ytd shape', () => {
      expect(qk.dashboard.ytd(2025, 'fy')).toEqual(['dashboard', 'ytd', 2025, 'fy'])
    })
  })

  describe('transactions factory', () => {
    it('raw shape', () => {
      expect(qk.transactions.raw(2025, 4, 'fy')).toEqual(['transactions', 'raw', 2025, 4, 'fy'])
    })

    it('processed shape', () => {
      expect(qk.transactions.processed(2025, 4, 'cat-1', 'tag-1', 'fy')).toEqual([
        'transactions',
        'processed',
        2025,
        4,
        'cat-1',
        'tag-1',
        'fy',
      ])
    })

    it('processedAll', () => {
      expect(qk.transactions.processedAll()).toEqual(['transactions', 'processedAll'])
    })

    it('pendingManual', () => {
      expect(qk.transactions.pendingManual()).toEqual(['transactions', 'pendingManual'])
    })
  })
})

describe('invalidateDomains', () => {
  function makeClient() {
    const qc = new QueryClient()
    qc.setQueryData(qk.budget.byYear(2025), [{ id: 'b1' }])
    qc.setQueryData(qk.budget.overrides(2025), [{ id: 'o1' }])
    qc.setQueryData(qk.dashboard.summary(2025, 4), [{ id: 's1' }])
    qc.setQueryData(qk.transactions.processed(2025, 4), [{ id: 't1' }])
    qc.setQueryData(qk.categories.all, [{ id: 'c1' }])
    return qc
  }

  it('invalidates budgetOverrides when domain "budget" is passed', () => {
    const qc = makeClient()
    invalidateDomains(qc, ['budget'])
    expect(qc.getQueryState(qk.budget.byYear(2025))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(qk.budget.overrides(2025))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(qk.dashboard.summary(2025, 4))?.isInvalidated).toBe(false)
  })

  it('invalidates multiple domains in one call', () => {
    const qc = makeClient()
    invalidateDomains(qc, ['budget', 'dashboard'])
    expect(qc.getQueryState(qk.budget.byYear(2025))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(qk.budget.overrides(2025))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(qk.dashboard.summary(2025, 4))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(qk.categories.all)?.isInvalidated).toBe(false)
  })
})

describe('clearAllQueries', () => {
  it('removes every cached query', () => {
    const qc = new QueryClient()
    qc.setQueryData(qk.budget.byYear(2025), [{ id: 'b1' }])
    qc.setQueryData(qk.transactions.processed(2025, 4), [{ id: 't1' }])
    clearAllQueries(qc)
    expect(qc.getQueryData(qk.budget.byYear(2025))).toBeUndefined()
    expect(qc.getQueryData(qk.transactions.processed(2025, 4))).toBeUndefined()
  })
})
