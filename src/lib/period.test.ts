import {
  DEFAULT_PERIOD_MODE,
  PERIOD_MODE_STORAGE_KEY,
  formatYearLabel,
  getCurrentPeriod,
  loadPeriodMode,
  monthLongLabel,
  monthShortLabel,
  resolvePeriodMonth,
  savePeriodMode,
} from './period'

describe('savePeriodMode / loadPeriodMode round-trip', () => {
  beforeEach(() => localStorage.clear())

  it('persists calendar mode', () => {
    savePeriodMode('calendar')
    expect(loadPeriodMode()).toBe('calendar')
  })

  it('persists fy mode', () => {
    savePeriodMode('fy')
    expect(loadPeriodMode()).toBe('fy')
  })
})

describe('loadPeriodMode', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to fy when localStorage is empty', () => {
    expect(loadPeriodMode()).toBe('fy')
  })

  it('defaults to fy when value is invalid', () => {
    localStorage.setItem(PERIOD_MODE_STORAGE_KEY, 'invalid')
    expect(loadPeriodMode()).toBe('fy')
  })

  it('returns calendar when stored', () => {
    localStorage.setItem(PERIOD_MODE_STORAGE_KEY, 'calendar')
    expect(loadPeriodMode()).toBe('calendar')
  })

  it('returns fy when stored', () => {
    localStorage.setItem(PERIOD_MODE_STORAGE_KEY, 'fy')
    expect(loadPeriodMode()).toBe('fy')
  })

  it('DEFAULT_PERIOD_MODE is fy', () => {
    expect(DEFAULT_PERIOD_MODE).toBe('fy')
  })
})

describe('formatYearLabel', () => {
  it('calendar mode returns the year as a string', () => {
    expect(formatYearLabel(2025, 'calendar')).toBe('2025')
  })

  it('fy mode returns FY YY-YY+1 format', () => {
    expect(formatYearLabel(2025, 'fy')).toBe('FY 25-26')
  })

  it('fy mode handles century boundary', () => {
    expect(formatYearLabel(1999, 'fy')).toBe('FY 99-00')
  })
})

describe('monthLongLabel', () => {
  it('calendar mode: index 1 is January', () => {
    expect(monthLongLabel(1, 'calendar')).toBe('January')
  })

  it('calendar mode: index 12 is December', () => {
    expect(monthLongLabel(12, 'calendar')).toBe('December')
  })

  it('fy mode: index 1 is April', () => {
    expect(monthLongLabel(1, 'fy')).toBe('April')
  })

  it('fy mode: index 12 is March', () => {
    expect(monthLongLabel(12, 'fy')).toBe('March')
  })
})

describe('monthShortLabel', () => {
  it('calendar mode: index 1 is Jan', () => {
    expect(monthShortLabel(1, 'calendar')).toBe('Jan')
  })

  it('fy mode: index 1 is Apr', () => {
    expect(monthShortLabel(1, 'fy')).toBe('Apr')
  })

  it('fy mode: index 12 is Mar', () => {
    expect(monthShortLabel(12, 'fy')).toBe('Mar')
  })
})

describe('getCurrentPeriod', () => {
  it('calendar mode: April 2025 → {year:2025, month:4}', () => {
    const now = new Date(2025, 3, 1) // April is month index 3
    expect(getCurrentPeriod('calendar', now)).toEqual({ year: 2025, month: 4 })
  })

  it('fy mode: April 2025 → {year:2025, month:1}', () => {
    const now = new Date(2025, 3, 1)
    expect(getCurrentPeriod('fy', now)).toEqual({ year: 2025, month: 1 })
  })

  it('fy mode: March 2025 → {year:2024, month:12}', () => {
    const now = new Date(2025, 2, 1) // March is month index 2
    expect(getCurrentPeriod('fy', now)).toEqual({ year: 2024, month: 12 })
  })

  it('fy mode: January 2025 → {year:2024, month:10}', () => {
    const now = new Date(2025, 0, 1) // January is month index 0
    expect(getCurrentPeriod('fy', now)).toEqual({ year: 2024, month: 10 })
  })
})

describe('resolvePeriodMonth', () => {
  it('calendar mode is a pass-through', () => {
    expect(resolvePeriodMonth(2025, 4, 'calendar')).toEqual({ year: 2025, month: 4 })
    expect(resolvePeriodMonth(2025, 1, 'calendar')).toEqual({ year: 2025, month: 1 })
  })

  it('fy mode: period month 1 (April) → calendar April in same year', () => {
    expect(resolvePeriodMonth(2025, 1, 'fy')).toEqual({ year: 2025, month: 4 })
  })

  it('fy mode: period month 12 (March) → calendar March in next year', () => {
    expect(resolvePeriodMonth(2025, 12, 'fy')).toEqual({ year: 2026, month: 3 })
  })

  it('fy mode: period month 9 (December) → calendar December in same year', () => {
    // FY month 9 maps to December: ((9-1+3)%12)+1 = (11%12)+1 = 12; 12 < 4 so year = 2025+1? No:
    // calMonth = ((9-1+3)%12)+1 = (11)%12+1 = 12; calYear = 12>=4 ? 2025 : 2025+1 → 2025
    expect(resolvePeriodMonth(2025, 9, 'fy')).toEqual({ year: 2025, month: 12 })
  })

  it('fy mode round-trip: getCurrentPeriod then resolvePeriodMonth returns calendar date', () => {
    const now = new Date(2025, 3, 15) // April 15, 2025
    const { year, month } = getCurrentPeriod('fy', now)
    const resolved = resolvePeriodMonth(year, month, 'fy')
    expect(resolved).toEqual({ year: 2025, month: 4 })
  })
})
