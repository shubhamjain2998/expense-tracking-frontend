import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { TransactionsPage } from '@/pages/TransactionsPage'

import { makeProcessedTransaction, makeRawTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

describe('Bulk selection bar', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('shows persistent checkboxes, lets user check rows and clear via × button', async () => {
    const raw1 = makeRawTransaction({ id: 'r1', description: 'Supermarket' })
    const raw2 = makeRawTransaction({ id: 'r2', description: 'Coffee Shop' })

    server.use(
      http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([raw1, raw2]))
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    // Wait for table
    const tableEl = await screen.findByRole('table')

    // Checkboxes are persistent (always visible — not hover-gated).
    // getAllByRole('checkbox') returns the header select-all (index 0) plus
    // one per row. Scope to the table to avoid false positives elsewhere.
    const checkboxes = await within(tableEl).findAllByRole('checkbox')
    // header select-all + 2 row checkboxes
    expect(checkboxes.length).toBeGreaterThanOrEqual(3)

    // Click a row checkbox. The checkbox's <td> parent carries the real
    // onClick handler. Use fireEvent.click on the checkbox's parent <td>
    // because userEvent.click on a controlled input doesn't guarantee
    // the parent td onClick fires in all React/JSDOM combinations.
    fireEvent.click(checkboxes[1].closest('td')!)

    // BulkActionsBar should appear — it has the "Categorise" action button
    expect(await screen.findByRole('button', { name: /bulk categorise/i })).toBeInTheDocument()

    // Clear via the × button
    await user.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /bulk categorise/i })).not.toBeInTheDocument()
    })
  })

  it('shows bulk bar, Esc clears selection', async () => {
    const raw1 = makeRawTransaction({ id: 'r3', description: 'Restaurant' })

    server.use(http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([raw1])))

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const tableEl2 = await screen.findByRole('table')
    const checkboxes2 = await within(tableEl2).findAllByRole('checkbox')
    fireEvent.click(checkboxes2[1].closest('td')!)

    // BulkActionsBar visible
    expect(await screen.findByRole('button', { name: /bulk categorise/i })).toBeInTheDocument()

    // Esc clears selection
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /bulk categorise/i })).not.toBeInTheDocument()
    })
  })

  it('bulk categorise applies category to selected rows via process mutation', async () => {
    const raw1 = makeRawTransaction({ id: 'r4', description: 'Swiggy' })

    let processBody: unknown = null
    server.use(
      http.get('http://localhost:8000/transactions/raw', () => HttpResponse.json([raw1])),
      http.post('http://localhost:8000/transactions/process', async ({ request }) => {
        processBody = await request.json()
        return HttpResponse.json({
          id: 'proc-bulk',
          raw_txn_id: raw1.id,
          mapping_id: null,
          category_id: 'cat-1',
          category: 'Groceries',
          txn_date: raw1.txn_date,
          description: raw1.description,
          amount: raw1.amount,
          effective_amount: raw1.amount,
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

    const tableEl3 = await screen.findByRole('table')
    const checkboxes3 = await within(tableEl3).findAllByRole('checkbox')
    fireEvent.click(checkboxes3[1].closest('td')!)

    // BulkActionsBar visible (Categorise button confirms it)
    expect(await screen.findByRole('button', { name: /bulk categorise/i })).toBeInTheDocument()

    // Click the Categorise button to reveal the picker
    await user.click(screen.getByRole('button', { name: /bulk categorise/i }))

    // SearchableSelect input should appear
    const catInput = await screen.findByPlaceholderText(/pick a category/i)
    await user.click(catInput)
    await user.type(catInput, 'Groc')

    const listbox = await screen.findByRole('listbox')
    await user.click(within(listbox).getByRole('option', { name: 'Groceries' }))

    // Apply
    await user.click(screen.getByRole('button', { name: /apply/i }))

    // Verify the process endpoint was called
    await waitFor(() => {
      expect(processBody).toMatchObject({
        raw_txn_id: raw1.id,
        category_id: 'cat-1',
      })
    })

    // Success toast and selection cleared
    expect(await screen.findByText(/categorised 1 transaction/i)).toBeInTheDocument()
  })

  it('header shows split when both income and expenses are present', async () => {
    const expense = makeProcessedTransaction({
      id: 'pe1',
      description: 'Rent',
      effective_amount: '-5000.00',
      txn_type: 'expense',
    })
    const income = makeProcessedTransaction({
      id: 'pe2',
      description: 'Salary',
      effective_amount: '-10000.00', // negative = money in
      txn_type: 'income',
    })

    server.use(
      http.get('http://localhost:8000/transactions/processed', () =>
        HttpResponse.json([expense, income])
      )
    )

    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    // Both expense and income — header should show the split ("−₹…" and "+₹…")
    // The exact format depends on en-IN locale in JSDOM; check for presence of
    // both directional indicators rather than exact currency strings.
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toMatch(/−/)
      expect(heading.textContent).toMatch(/\+/)
    })
  })
})
