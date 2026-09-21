/**
 * Phase 9 regression tests for two TransactionRow defects found in the
 * ledger sweep:
 *
 * 1. The per-row "more actions" (⋯) button had no accessible name at all
 *    (its icon is `aria-hidden`) — confirmed live via a DOM audit that
 *    flagged 50 instances of `button.btn.ghost.icon.sm` with no text,
 *    `aria-label` or `title` on /transactions.
 * 2. The split-avatars tooltip ("Split N ways — Total ... you ...") used a
 *    native `title` attribute, which can't be clamped or flipped and was
 *    observed clipped at the right viewport edge. It's now the portal-
 *    based `Tooltip` component, which always renders into `document.body`
 *    (escaping the table's own layout) and exposes `role="tooltip"`.
 */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { TransactionsPage } from '@/pages/TransactionsPage'

import { makeProcessedTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

function setUpSplitTransaction() {
  const split = makeProcessedTransaction({
    id: 'p-split',
    description: 'Pzbroadband',
    category_id: 'cat-1',
    category: 'Groceries',
    effective_amount: '-1591.23',
    shares: [
      {
        person_id: 'person-1',
        person_name: 'anshul',
        share_type: 'amount',
        share_value: '1591.23',
        share_amount: '1591.23',
        settled: false,
      },
    ],
  })
  server.use(
    http.get('http://localhost:8000/transactions/processed', () => HttpResponse.json([split]))
  )
}

describe('TransactionRow a11y (Phase 9)', () => {
  it('the "more actions" button has an accessible name', async () => {
    setUpSplitTransaction()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const moreButton = await screen.findByRole('button', { name: 'More actions' })
    expect(moreButton).toBeInTheDocument()
    expect(moreButton).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('the split-avatars tooltip renders the full breakdown on hover, not a native title', async () => {
    setUpSplitTransaction()
    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const splitButton = await screen.findByRole('button', { name: /Split 2 ways/ })
    // Not a native title — the whole point is that a native title can't be
    // clamped/flipped to stay on screen.
    expect(splitButton).not.toHaveAttribute('title')

    await user.hover(splitButton)
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('Split 2 ways')
    expect(tooltip).toHaveTextContent('anshul')
  })
})
