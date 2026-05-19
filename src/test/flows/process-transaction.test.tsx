import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { TransactionsPage } from '@/pages/TransactionsPage'

import { makeRawTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

describe('Process transaction flow', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('filters by search term and status filter, then clears', async () => {
    const rawTxn = makeRawTransaction({ id: 'raw-s1', description: 'Supermarket' })
    const otherTxn = makeRawTransaction({ id: 'raw-s2', description: 'Electricity Bill' })

    server.use(
      http.get('http://localhost:8000/transactions/raw', () =>
        HttpResponse.json([rawTxn, otherTxn])
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    // Both transactions appear initially
    expect(await screen.findByText('Supermarket')).toBeInTheDocument()
    expect(screen.getByText('Electricity Bill')).toBeInTheDocument()

    // Search filters to only "Supermarket"
    const searchInput = screen.getByPlaceholderText(/search merchant/i)
    await user.type(searchInput, 'Supermarket')

    expect(screen.getByText('Supermarket')).toBeInTheDocument()
    expect(screen.queryByText('Electricity Bill')).not.toBeInTheDocument()

    // Clear search to see all again
    await user.clear(searchInput)
    expect(await screen.findByText('Electricity Bill')).toBeInTheDocument()

    // Click "pending" status filter — covers statusFilter branch in the filter fn
    await user.click(screen.getByRole('button', { name: /pending/i }))
    expect(screen.getByText('Supermarket')).toBeInTheDocument()

    // Click "all" to reset
    await user.click(screen.getByRole('button', { name: /^all$/i }))

    // Navigate to previous month (covers prevMonth / nextMonth)
    await user.click(screen.getByRole('button', { name: 'chevron_left' }))
    await user.click(screen.getByRole('button', { name: 'chevron_right' }))

    // Click "Date" column header to toggle sort (covers toggleSort)
    await user.click(screen.getByRole('columnheader', { name: /date/i }))
    await user.click(screen.getByRole('columnheader', { name: /date/i })) // toggle desc→asc
  })

  it('opens process panel, picks a category, and submits', async () => {
    const rawTxn = makeRawTransaction({ id: 'raw-1', description: 'Supermarket' })

    server.use(
      http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([rawTxn]))
    )

    let processedBody: unknown = null
    server.use(
      http.post('http://localhost:8000/transactions/process', async ({ request }) => {
        processedBody = await request.json()
        return HttpResponse.json({
          id: 'proc-new',
          raw_txn_id: rawTxn.id,
          mapping_id: null,
          category_id: 'cat-1',
          category: 'Groceries',
          txn_date: rawTxn.txn_date,
          description: rawTxn.description,
          amount: rawTxn.amount,
          effective_amount: rawTxn.amount,
          month: 5,
          year: 2026,
          notes: null,
          shares: [],
          tags: [],
        })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    // Wait for the transaction row to appear
    const txnCell = await screen.findByText('Supermarket')
    await user.click(txnCell)

    // ProcessPanel should now be visible
    expect(await screen.findByText('Process transaction')).toBeInTheDocument()

    // Select a category via SearchableSelect (scope to the listbox, not the FilterBar <select>)
    const categoryInput = screen.getByLabelText('Category')
    await user.click(categoryInput)
    await user.clear(categoryInput)
    await user.type(categoryInput, 'Groceries')

    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'Groceries' }))

    // Submit
    await user.click(screen.getByRole('button', { name: /process transaction/i }))

    // Verify the POST was called with the correct category
    await waitFor(() => {
      expect(processedBody).toMatchObject({ category_id: 'cat-1', raw_txn_id: rawTxn.id })
    })

    // Success toast
    expect(await screen.findByText(/transaction processed/i)).toBeInTheDocument()
  })
})
