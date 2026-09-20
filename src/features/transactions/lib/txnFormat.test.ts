import { describe, expect, it } from 'vitest'

import type { UnifiedTxn } from '../types'

import { splitInfo } from './txnFormat'

function txn(partial: Partial<UnifiedTxn> = {}): UnifiedTxn {
  return {
    uid: 'proc_1',
    txn_date: '2026-09-14',
    description: 'Dinner',
    amount: '1800.00',
    effectiveAmount: '450.00',
    kind: 'processed',
    txnType: 'expense',
    tags: [],
    shares: [],
    ...partial,
  }
}

function share(person_name: string, share_amount: string) {
  return {
    person_id: person_name,
    person_name,
    share_type: 'percentage' as const,
    share_value: '25',
    share_amount,
    settled: false,
  }
}

describe('splitInfo', () => {
  it('returns null when the transaction is not split', () => {
    expect(splitInfo(txn())).toBeNull()
  })

  it('reports the total bill, the user share and everyone else', () => {
    const info = splitInfo(
      txn({
        shares: [share('Alice', '450.00'), share('Bob', '450.00'), share('Cara', '450.00')],
      })
    )

    expect(info).not.toBeNull()
    expect(info?.total).toBe(1800)
    expect(info?.yourShare).toBe(450)
    expect(info?.othersTotal).toBe(1350)
    // Three friends plus the user.
    expect(info?.peopleCount).toBe(4)
  })

  it('names every person in the breakdown, starting with the total', () => {
    const info = splitInfo(txn({ shares: [share('Alice', '900.00')], effectiveAmount: '900.00' }))
    expect(info?.breakdown).toContain('Total')
    expect(info?.breakdown).toContain('Alice')
    expect(info?.breakdown).toContain('you')
  })

  it('uses absolute values so credit-signed amounts still read correctly', () => {
    const info = splitInfo(
      txn({ amount: '-1800.00', effectiveAmount: '-450.00', shares: [share('Alice', '-1350.00')] })
    )
    expect(info?.total).toBe(1800)
    expect(info?.yourShare).toBe(450)
    expect(info?.othersTotal).toBe(1350)
  })
})
