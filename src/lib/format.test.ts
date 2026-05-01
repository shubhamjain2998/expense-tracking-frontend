import {
  formatCompact,
  formatCurrency,
  formatLongDate,
  formatShortDate,
  todayIsoDate,
} from './format'

describe('formatCurrency', () => {
  it('formats whole rupees with ₹ symbol and comma separator', () => {
    expect(formatCurrency(1234)).toBe('₹1,234')
  })

  it('defaults to 0 fraction digits', () => {
    expect(formatCurrency(1234.56)).toBe('₹1,235')
  })

  it('formats with 2 fraction digits when specified', () => {
    expect(formatCurrency(1234.56, { fractionDigits: 2 })).toBe('₹1,234.56')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0')
  })
})

describe('formatCompact', () => {
  it('formats values under 1000 as plain rupees', () => {
    expect(formatCompact(500)).toBe('₹500')
  })

  it('formats values >= 1000 with k suffix', () => {
    expect(formatCompact(1234)).toBe('₹1.2k')
  })

  it('formats values >= 100000 with L suffix', () => {
    expect(formatCompact(123456)).toBe('₹1.2L')
  })

  it('formats negative values (sign before the number)', () => {
    // implementation: `₹${(n/1000).toFixed(1)}k` → '₹-1.2k'
    expect(formatCompact(-1234)).toBe('₹-1.2k')
  })

  it('rounds small values', () => {
    expect(formatCompact(499)).toBe('₹499')
    expect(formatCompact(500.6)).toBe('₹501')
  })
})

describe('formatShortDate', () => {
  it('formats an ISO datetime string as "D Mon"', () => {
    expect(formatShortDate('2025-04-15T00:00:00')).toBe('15 Apr')
  })

  it('also accepts plain date strings', () => {
    expect(formatShortDate('2025-01-01')).toBe('1 Jan')
  })
})

describe('formatLongDate', () => {
  it('formats a date string as "D Month YYYY"', () => {
    expect(formatLongDate('2025-04-15')).toBe('15 April 2025')
  })

  it('also works with datetime strings (ignores time part)', () => {
    expect(formatLongDate('2025-12-31T23:59:59')).toBe('31 December 2025')
  })
})

describe('todayIsoDate', () => {
  it('matches the current date in YYYY-MM-DD format', () => {
    const fixed = new Date('2025-04-15T12:00:00Z')
    vi.setSystemTime(fixed)
    expect(todayIsoDate()).toBe(new Date().toISOString().slice(0, 10))
    vi.useRealTimers()
  })

  it('returns a string matching YYYY-MM-DD pattern', () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
