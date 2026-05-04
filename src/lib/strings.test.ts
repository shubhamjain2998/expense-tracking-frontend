import { getInitials } from './strings'

describe('getInitials', () => {
  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('extracts initials from email (first.last@example.com → FL)', () => {
    expect(getInitials('first.last@example.com')).toBe('FL')
  })

  it('extracts initials from full name (Shubham Jain → SJ)', () => {
    expect(getInitials('Shubham Jain')).toBe('SJ')
  })

  it('returns uppercased first two chars for a single-word input', () => {
    expect(getInitials('a')).toBe('A')
  })

  it('returns two initials from underscore-separated words (foo_bar_baz → FB)', () => {
    expect(getInitials('foo_bar_baz')).toBe('FB')
  })

  it('handles hyphen-separated names', () => {
    expect(getInitials('Anne-Marie')).toBe('AM')
  })

  it('handles dot-separated words without @', () => {
    expect(getInitials('first.last')).toBe('FL')
  })
})
