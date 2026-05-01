import {
  IGNORE_RULES_EVENT,
  addIgnoreRule,
  getIgnoreRules,
  matchesAnyRule,
  removeIgnoreRule,
} from './ignoreRules'

describe('ignoreRules', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getIgnoreRules', () => {
    it('returns [] when localStorage is empty', () => {
      expect(getIgnoreRules()).toEqual([])
    })

    it('returns [] when localStorage contains invalid JSON', () => {
      localStorage.setItem('ignore_rules', '{not json}')
      expect(getIgnoreRules()).toEqual([])
    })

    it('returns [] when stored value is not an array', () => {
      localStorage.setItem('ignore_rules', '{"key": "value"}')
      expect(getIgnoreRules()).toEqual([])
    })

    it('filters out non-string entries', () => {
      localStorage.setItem('ignore_rules', '["atm", 42, null, "interest"]')
      expect(getIgnoreRules()).toEqual(['atm', 'interest'])
    })
  })

  describe('addIgnoreRule', () => {
    it('appends a new keyword', () => {
      addIgnoreRule('atm')
      expect(getIgnoreRules()).toEqual(['atm'])
    })

    it('normalizes to lowercase', () => {
      addIgnoreRule('ATM Withdrawal')
      expect(getIgnoreRules()).toContain('atm withdrawal')
    })

    it('trims whitespace', () => {
      addIgnoreRule('  interest  ')
      expect(getIgnoreRules()).toContain('interest')
    })

    it('deduplicates — adding the same keyword twice is a no-op', () => {
      addIgnoreRule('atm')
      addIgnoreRule('ATM')
      expect(getIgnoreRules()).toEqual(['atm'])
    })

    it('returns the updated rules list', () => {
      addIgnoreRule('atm')
      const result = addIgnoreRule('interest')
      expect(result).toEqual(['atm', 'interest'])
    })

    it('dispatches IGNORE_RULES_EVENT', () => {
      const handler = vi.fn()
      window.addEventListener(IGNORE_RULES_EVENT, handler)
      addIgnoreRule('atm')
      expect(handler).toHaveBeenCalledTimes(1)
      window.removeEventListener(IGNORE_RULES_EVENT, handler)
    })
  })

  describe('removeIgnoreRule', () => {
    it('removes an existing keyword', () => {
      addIgnoreRule('atm')
      addIgnoreRule('interest')
      removeIgnoreRule('atm')
      expect(getIgnoreRules()).toEqual(['interest'])
    })

    it('is a no-op when the keyword does not exist', () => {
      addIgnoreRule('atm')
      removeIgnoreRule('nonexistent')
      expect(getIgnoreRules()).toEqual(['atm'])
    })

    it('returns the updated rules list', () => {
      addIgnoreRule('atm')
      addIgnoreRule('interest')
      const result = removeIgnoreRule('atm')
      expect(result).toEqual(['interest'])
    })

    it('dispatches IGNORE_RULES_EVENT', () => {
      addIgnoreRule('atm')
      const handler = vi.fn()
      window.addEventListener(IGNORE_RULES_EVENT, handler)
      removeIgnoreRule('atm')
      expect(handler).toHaveBeenCalledTimes(1)
      window.removeEventListener(IGNORE_RULES_EVENT, handler)
    })
  })

  describe('matchesAnyRule', () => {
    it('returns false when rules list is empty', () => {
      expect(matchesAnyRule('ATM Withdrawal', [])).toBe(false)
    })

    it('is case-insensitive on the description side (rules are stored lowercase)', () => {
      // The function lowercases the description before matching
      expect(matchesAnyRule('ATM Withdrawal', ['atm'])).toBe(true)
      expect(matchesAnyRule('ATM Withdrawal', ['withdrawal'])).toBe(true)
      // Rules come from addIgnoreRule which normalises to lowercase, so callers pass lowercase
      expect(matchesAnyRule('Salary Credit', ['salary'])).toBe(true)
    })

    it('returns true when any rule matches', () => {
      expect(matchesAnyRule('Interest Reversal', ['atm', 'interest'])).toBe(true)
    })

    it('returns false when no rule matches', () => {
      expect(matchesAnyRule('Salary Credit', ['atm', 'interest'])).toBe(false)
    })

    it('matches partial substrings', () => {
      expect(matchesAnyRule('NEFT/RTGS Transfer', ['neft'])).toBe(true)
    })
  })
})
