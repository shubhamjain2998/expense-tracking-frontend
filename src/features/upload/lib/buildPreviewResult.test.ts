import { getProcessedTransactions, getRawTransactions } from '@/lib/api/transactions'
import type { PreviewResponse } from '@/types/transaction'

import { buildPreviewResult } from './buildPreviewResult'

vi.mock('@/lib/api/transactions', () => ({
  getRawTransactions: vi.fn(),
  getProcessedTransactions: vi.fn(),
}))

const mockGetRaw = vi.mocked(getRawTransactions)
const mockGetProcessed = vi.mocked(getProcessedTransactions)

function preview(
  rows: { txn_date: string; description: string; amount: string }[]
): PreviewResponse {
  return { rows, would_insert: rows.length, skipped: 0, skipped_rows: [] }
}

describe('buildPreviewResult duplicate detection', () => {
  beforeEach(() => {
    mockGetRaw.mockReset().mockResolvedValue([])
    mockGetProcessed.mockReset().mockResolvedValue([])
  })

  // Regression test for the Phase 8c second-pass finding: a row matching an
  // already-CATEGORISED transaction wasn't flagged as a duplicate, because
  // buildPreviewResult only checked /transactions/raw — and a transaction
  // leaves the "raw" table the moment it's categorised. In practice nearly
  // every transaction gets categorised soon after import, so this made the
  // import dedupe safety net nearly useless for the realistic case of
  // re-pasting/re-uploading a statement that's already been processed.
  it('flags a row as a duplicate when it matches an already-processed transaction', async () => {
    mockGetProcessed.mockResolvedValue([
      {
        id: 'p1',
        raw_txn_id: 'r1',
        mapping_id: null,
        category_id: 'c1',
        category: 'subscriptions',
        txn_date: '2026-06-12',
        description: 'Gyftr Via Smartbuy New',
        amount: '679.15',
        effective_amount: '679.15',
        month: 6,
        year: 2026,
        notes: null,
        txn_type: 'expense',
        shares: [],
        tags: [],
      },
    ])

    const result = await buildPreviewResult(
      preview([
        { txn_date: '2026-06-12', description: 'Gyftr Via Smartbuy New', amount: '679.15' },
      ]),
      []
    )

    expect(result.dupeIndices.has(0)).toBe(true)
    expect(result.autoExcluded.has(0)).toBe(true)
  })

  it('still flags a row as a duplicate when it matches an unprocessed raw transaction', async () => {
    mockGetRaw.mockResolvedValue([
      {
        id: 'r1',
        txn_date: '2026-06-20',
        description: 'New Cafe Test',
        amount: '150.00',
        status: 'pending',
      },
    ])

    const result = await buildPreviewResult(
      preview([{ txn_date: '2026-06-20', description: 'New Cafe Test', amount: '150.00' }]),
      []
    )

    expect(result.dupeIndices.has(0)).toBe(true)
  })

  it('does not flag a genuinely new row', async () => {
    const result = await buildPreviewResult(
      preview([{ txn_date: '2026-06-25', description: 'Brand New Merchant', amount: '42.00' }]),
      []
    )

    expect(result.dupeIndices.size).toBe(0)
    expect(result.autoExcluded.size).toBe(0)
  })
})
