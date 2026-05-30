import { isLikelyTransactionLine } from './isLikelyTransactionLine'

describe('isLikelyTransactionLine', () => {
  describe('real transaction-like lines (should be flagged)', () => {
    it.each([
      '12/05/2026 | Swiggy Bangalore | 1,092.00',
      '2026-05-12 SWIGGY 1092.00',
      '12 May SWIGGY 1,092.00',
      'May 12 SWIGGY 1092.00',
      '12-May-2026 Blinkit 386.00',
      '21/05 Credit Card Payment 17,773.00',
    ])('flags %s', (line) => {
      expect(isLikelyTransactionLine(line)).toBe(true)
    })
  })

  describe('noise lines from real PDFs (should NOT be flagged)', () => {
    it.each([
      // From the HDFC Regalia statement noise the user reported
      'SHUBHAM JAIN Credit Card No. 552260XXXXXX4649 Alternate Account Number 0001018170000224641 102, LORVIN MEADOWS GARUDACHA',
      'er: c',
      'avin',
      '=',
      'PAYMENTS/CREDITS PURCHASES/DEBIT RECEIVED (Current Billing Cycle)',
      'C56,970.00 + C18,873.67',
      'AVAILABLE CREDIT LIMIT',
      'C3,89,502',
      'Reward Points 2,153 | 0 1,',
      'P | OINTS EXPIRING | IN 30 DAYS 0 | IN 60 DAYS 0',
      'SR NO. PROGRAMS BONUS POINTS',
      '1 | FCYConversion 1 pts',
      '2 | Regalia Gold DomesticLounge Fresh 1 pts',
      '6 | Reward Points_on_Telecom 4 pts',
      'GST Type | Invoice Number | GST Rate %',
      '',
    ])('ignores %s', (line) => {
      expect(isLikelyTransactionLine(line)).toBe(false)
    })
  })

  it('needs both a date and a decimal amount — date alone is not enough', () => {
    expect(isLikelyTransactionLine('12/05/2026 — payment reminder')).toBe(false)
  })

  it('needs both a date and a decimal amount — amount alone is not enough', () => {
    expect(isLikelyTransactionLine('Reward Points 2,153.00 total')).toBe(false)
  })
})
