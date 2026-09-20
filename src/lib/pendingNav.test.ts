import { describe, expect, it } from 'vitest'

import type { PendingManualTransaction } from '@/types/transaction'

import { pendingTransactionsUrl } from './pendingNav'

function item(txn_date: string): PendingManualTransaction {
  return {
    id: txn_date,
    txn_date,
    description: 'Test',
    amount: '-100.00',
    status: 'pending',
  }
}

describe('pendingTransactionsUrl', () => {
  it('returns the plain route when there is nothing pending', () => {
    expect(pendingTransactionsUrl([], 'fy')).toBe('/transactions')
  })

  it('calendar mode: uses the calendar month of the most recent pending txn', () => {
    const url = pendingTransactionsUrl([item('2026-07-02'), item('2026-09-14')], 'calendar')
    expect(url).toBe('/transactions?year=2026&month=9')
  })

  it('fy mode: converts the calendar month to the FY period month', () => {
    // September 2026 is FY 26-27, period month 6 — not month 9 (December).
    const url = pendingTransactionsUrl([item('2026-09-14')], 'fy')
    expect(url).toBe('/transactions?year=2026&month=6')
  })

  it('fy mode: January belongs to the previous FY year', () => {
    const url = pendingTransactionsUrl([item('2026-01-05')], 'fy')
    expect(url).toBe('/transactions?year=2025&month=10')
  })
})
