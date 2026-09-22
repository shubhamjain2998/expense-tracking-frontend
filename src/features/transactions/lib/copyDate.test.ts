import { describe, expect, it } from 'vitest'

import { daysInMonth, monthYearLabel, monthsApart, shiftMonths } from './copyDate'

describe('shiftMonths', () => {
  it('keeps the day of the month when the target month is long enough', () => {
    expect(shiftMonths('2026-09-20', 1)).toBe('2026-10-20')
    expect(shiftMonths('2026-09-20', -1)).toBe('2026-08-20')
  })

  it('clamps instead of overflowing into the next month', () => {
    // Plain Date arithmetic lands on 3 March here — a copy must stay in the
    // month the user stepped to.
    expect(shiftMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(shiftMonths('2024-01-31', 1)).toBe('2024-02-29') // leap year
    expect(shiftMonths('2026-05-31', 1)).toBe('2026-06-30')
  })

  it('crosses year boundaries in both directions', () => {
    expect(shiftMonths('2026-12-15', 1)).toBe('2027-01-15')
    expect(shiftMonths('2026-01-15', -1)).toBe('2025-12-15')
    expect(shiftMonths('2026-01-15', -13)).toBe('2024-12-15')
    expect(shiftMonths('2026-06-10', 12)).toBe('2027-06-10')
  })

  it('accepts a full ISO timestamp and returns a plain date', () => {
    expect(shiftMonths('2026-09-20T00:00:00', 1)).toBe('2026-10-20')
  })

  it('returns the input unchanged when it is not a date', () => {
    expect(shiftMonths('', 1)).toBe('')
    expect(shiftMonths('not-a-date', 1)).toBe('not-a-date')
  })
})

describe('monthYearLabel', () => {
  it('spells out the month the date lands in', () => {
    expect(monthYearLabel('2026-10-20')).toBe('October 2026')
    expect(monthYearLabel('2027-01-01')).toBe('January 2027')
  })

  it('returns an empty string for an unparseable date', () => {
    expect(monthYearLabel('nope')).toBe('')
  })
})

describe('monthsApart', () => {
  it('counts whole calendar months, ignoring the day', () => {
    expect(monthsApart('2026-09-20', '2026-10-01')).toBe(1)
    expect(monthsApart('2026-09-20', '2026-09-01')).toBe(0)
    expect(monthsApart('2026-09-20', '2025-09-20')).toBe(-12)
  })
})

describe('daysInMonth', () => {
  it('knows month lengths, leap years included', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })
})
