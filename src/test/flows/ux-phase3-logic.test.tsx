/**
 * Flow tests for ux/phase-3-logic items:
 *   1. Credit chip — "Credit — review" label + tooltip
 *   2. Search — extends to notes and amount
 *   3. Keyboard shortcut overlay — "?" opens modal
 */

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { TransactionsPage } from '@/pages/TransactionsPage'

import { makeRawTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

describe('ux/phase-3-logic: transactions page', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  // ── Item 1: Credit chip ────────────────────────────────────────────────────

  it('shows "Credit — review" for a pending credit (negative amount) row', async () => {
    // Negative amount = money in = credit in our sign convention.
    const creditTxn = makeRawTransaction({ id: 'raw-credit', amount: '-500.00' })
    server.use(
      http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([creditTxn]))
    )

    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })
    const table = within(await screen.findByRole('table'))

    // The chip text should now read "Credit — review" instead of "credit?".
    expect(table.getByText('Credit — review')).toBeInTheDocument()

    // The tooltip title should mention classification guidance.
    const chip = table.getByText('Credit — review')
    expect(chip.getAttribute('title')).toMatch(/refund|income|transfer/i)
  })

  it('shows "pending" for a regular debit (positive amount) row', async () => {
    const debitTxn = makeRawTransaction({ id: 'raw-debit', amount: '500.00' })
    server.use(
      http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([debitTxn]))
    )

    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })
    const table = within(await screen.findByRole('table'))

    expect(table.getByText('pending')).toBeInTheDocument()
    expect(table.queryByText('Credit — review')).not.toBeInTheDocument()
  })

  // ── Item 2: Search extension ───────────────────────────────────────────────

  it('filters by amount substring — "449" matches a ₹449 transaction', async () => {
    // amount is positive (debit), absolute value 449.
    const txn449 = makeRawTransaction({ id: 'raw-449', description: 'Swiggy', amount: '449.00' })
    const txn100 = makeRawTransaction({ id: 'raw-100', description: 'Coffee', amount: '100.00' })
    server.use(
      http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([txn449, txn100]))
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    await screen.findByRole('table')
    const table = () => within(screen.getByRole('table'))

    // Both visible initially.
    expect(table().getByText('Swiggy')).toBeInTheDocument()
    expect(table().getByText('Coffee')).toBeInTheDocument()

    // Search "449" — should show Swiggy (449) not Coffee (100).
    const searchInput = screen.getByPlaceholderText(/search merchant, notes, amount/i)
    await user.type(searchInput, '449')

    expect(table().getByText('Swiggy')).toBeInTheDocument()
    expect(table().queryByText('Coffee')).not.toBeInTheDocument()
  })

  it('has the updated placeholder "Search merchant, notes, amount…"', async () => {
    const txn = makeRawTransaction({ id: 'raw-ph', description: 'TestTxn' })
    server.use(http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([txn])))
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })
    await screen.findByRole('table')
    expect(screen.getByPlaceholderText(/search merchant, notes, amount/i)).toBeInTheDocument()
  })

  // ── Item 3: Keyboard shortcut overlay ─────────────────────────────────────

  it('pressing "?" opens the keyboard shortcuts modal', async () => {
    const txn = makeRawTransaction({ id: 'raw-ks' })
    server.use(http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([txn])))
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })
    await screen.findByRole('table')

    // Modal is not visible initially.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Press "?" (shift is false here since we fire it directly).
    await userEvent.keyboard('?')

    // Modal should appear.
    const dialog = await screen.findByRole('dialog', { name: /keyboard shortcuts/i })
    expect(dialog).toBeInTheDocument()

    // Key categories are listed (exact group headings from the modal).
    expect(within(dialog).getByText('Navigation')).toBeInTheDocument()
    expect(within(dialog).getByText('Categorise')).toBeInTheDocument()

    // Close with Esc.
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking the "?" hint button in FilterBar opens the shortcuts modal', async () => {
    const txn = makeRawTransaction({ id: 'raw-ks2' })
    server.use(http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([txn])))
    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })
    await screen.findByRole('table')

    // The "?" hint button is desktop-only (hidden on mobile by CSS) but still
    // in the DOM, so we can query it by aria-label.
    const hintButton = screen.getByRole('button', { name: /show keyboard shortcuts/i })
    await user.click(hintButton)

    expect(await screen.findByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument()
  })
})
