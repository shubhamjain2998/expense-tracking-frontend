/**
 * Regression test for the Phase 8c second-pass split/settle finding: after a
 * successful settle/unsettle mutation, EditPanel's Settlement rows kept
 * showing the PRE-mutation status. Live testing reproduced it: settle a
 * share, the PATCH succeeds (200) and the transactions list refetches, but
 * the open panel still shows "pending" — because `txn` is a snapshot passed
 * down once when the panel opens (TransactionsPage holds it in separate
 * state; see `transactions_page_architecture.md`), and the Settlement
 * section read `share.settled` straight off that stale prop instead of the
 * mutation's own result. A second click, still computed off the stale
 * value, always sent the same direction again — a user could never actually
 * unsettle a share from the panel without closing and reopening it first.
 *
 * Fix: EditPanel now tracks its own `settledOverrides` map, updated from
 * each settledMutation's onSuccess, and prefers it over the stale prop.
 */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { EditPanel } from '@/features/transactions/components/EditPanel'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { makeProcessedTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

const BASE = 'http://localhost:8000'

function txnWithShares(): ProcessedTransactionItem {
  return makeProcessedTransaction({
    id: 'txn-settle-1',
    amount: '290.00',
    effective_amount: '0.00',
    shares: [
      {
        person_id: 'p-anshul',
        person_name: 'anshul',
        share_type: 'percentage',
        share_value: '50.00',
        share_amount: '145.00',
        settled: false,
      },
      {
        person_id: 'p-priya',
        person_name: 'priya',
        share_type: 'percentage',
        share_value: '30.00',
        share_amount: '87.00',
        settled: false,
      },
    ],
  })
}

describe('EditPanel settlement toggle reflects its own mutation immediately', () => {
  it('shows "settled" right after a successful settle, without waiting on the stale txn prop', async () => {
    server.use(
      http.patch(`${BASE}/transactions/processed/:txnId/shares/:personId`, ({ params }) =>
        HttpResponse.json({ id: params.txnId, settled: true })
      )
    )

    const user = userEvent.setup()
    const txn = txnWithShares()
    renderWithProviders(
      <EditPanel txn={txn} categories={[]} onClose={() => {}} onSaved={() => {}} />
    )

    // Both rows start "pending".
    const buttons = await screen.findAllByRole('button', { name: 'pending' })
    expect(buttons).toHaveLength(2)

    await user.click(buttons[1])

    // Immediately reflects "settled" — no reload/reopen needed.
    expect(await screen.findByRole('button', { name: 'settled' })).toBeInTheDocument()
    // The other share is untouched.
    expect(screen.getAllByRole('button', { name: 'pending' })).toHaveLength(1)
  })

  it('unsettling after settling sends `settled: false`, not the stale direction', async () => {
    const seen: boolean[] = []
    server.use(
      http.patch(
        `${BASE}/transactions/processed/:txnId/shares/:personId`,
        async ({ request, params }) => {
          const body = (await request.json()) as { settled: boolean }
          seen.push(body.settled)
          return HttpResponse.json({ id: params.txnId, settled: body.settled })
        }
      )
    )

    const user = userEvent.setup()
    const txn = txnWithShares()
    renderWithProviders(
      <EditPanel txn={txn} categories={[]} onClose={() => {}} onSaved={() => {}} />
    )

    const buttons = await screen.findAllByRole('button', { name: 'pending' })
    await user.click(buttons[0]) // settle anshul
    await screen.findByRole('button', { name: 'settled' })

    // Click the same (now "settled") button again to unsettle.
    await user.click(screen.getByRole('button', { name: 'settled' }))
    await screen.findAllByRole('button', { name: 'pending' })

    expect(seen).toEqual([true, false])
  })
})
