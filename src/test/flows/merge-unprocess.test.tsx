/**
 * Flow tests for clubbing rows together and for undoing a categorisation.
 *
 * Both come from the same gap: a categorised row could only be deleted, so a
 * row categorised by mistake — or a payment that arrived as two statement
 * lines — had no route back.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { TransactionsPage } from '@/pages/TransactionsPage'

import { makeProcessedTransaction, makeRawTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

const BASE = 'http://localhost:8000'

describe('merge and unprocess', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  /** Checks a row by clicking the <td> that carries the handler. */
  async function checkRow(index: number) {
    const table = await screen.findByRole('table')
    const boxes = await within(table).findAllByRole('checkbox')
    fireEvent.click(boxes[index].closest('td')!)
  }

  it('merges two checked pending rows into the row the user picks as base', async () => {
    const raw1 = makeRawTransaction({
      id: 'raw-dominos',
      description: 'UPI-DOMINOS',
      amount: '368.82',
      txn_date: '2026-05-18',
    })
    const raw2 = makeRawTransaction({
      id: 'raw-hungerbox',
      description: 'Upi-hungerbox',
      amount: '50.00',
      txn_date: '2026-05-17',
    })
    let merged: unknown = null
    server.use(
      http.get(`${BASE}/transactions/raw`, () => HttpResponse.json([raw1, raw2])),
      http.post(`${BASE}/transactions/merge`, async ({ request }) => {
        merged = await request.json()
        return HttpResponse.json({
          kind: 'pending',
          raw_txn_id: 'raw-dominos',
          processed_id: null,
          amount: '418.82',
          merged_count: 2,
        })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    await checkRow(1)
    await checkRow(2)

    await user.click(await screen.findByRole('button', { name: /^merge$/i }))

    // The dialog states the outcome before the user commits to it.
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/merge 2 transactions/i)).toBeInTheDocument()
    expect(within(dialog).getByText('₹418.82')).toBeInTheDocument()

    // Second row as base: its date and description are the ones that survive.
    const radios = within(dialog).getAllByRole('radio')
    await user.click(radios[1])
    await user.click(within(dialog).getByRole('button', { name: /^merge$/i }))

    await waitFor(() => expect(merged).not.toBeNull())
    expect(merged).toEqual({
      base: { kind: 'pending', id: 'raw-hungerbox' },
      sources: [{ kind: 'pending', id: 'raw-dominos' }],
    })
  })

  it('merges a processed row with a pending one', async () => {
    const processed = makeProcessedTransaction({
      id: 'proc-1',
      raw_txn_id: 'raw-proc-1',
      description: 'TECHMASH SOLUTIONS',
      amount: '160.35',
      effective_amount: '160.35',
    })
    const raw = makeRawTransaction({
      id: 'raw-fee',
      description: 'Fcy Conversion Markup Fee',
      amount: '44.79',
    })
    let merged: unknown = null
    server.use(
      http.get(`${BASE}/transactions/raw`, () => HttpResponse.json([raw])),
      http.get(`${BASE}/transactions/processed`, () => HttpResponse.json([processed])),
      http.post(`${BASE}/transactions/merge`, async ({ request }) => {
        merged = await request.json()
        return HttpResponse.json({
          kind: 'processed',
          raw_txn_id: 'raw-proc-1',
          processed_id: 'proc-1',
          amount: '205.14',
          merged_count: 2,
        })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    await checkRow(1)
    await checkRow(2)
    await user.click(await screen.findByRole('button', { name: /^merge$/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('₹205.14')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^merge$/i }))

    await waitFor(() => expect(merged).not.toBeNull())
    const body = merged as { base: { kind: string }; sources: { kind: string }[] }
    expect(new Set([body.base.kind, body.sources[0].kind])).toEqual(
      new Set(['processed', 'pending'])
    )
  })

  it('refuses to merge money-in with money-out', async () => {
    const spend = makeRawTransaction({ id: 'raw-spend', description: 'Swiggy', amount: '400.00' })
    const refund = makeProcessedTransaction({
      id: 'proc-refund',
      raw_txn_id: 'raw-refund',
      description: 'Swiggy refund',
      amount: '-400.00',
      effective_amount: '-400.00',
      txn_type: 'refund',
    })
    server.use(
      http.get(`${BASE}/transactions/raw`, () => HttpResponse.json([spend])),
      http.get(`${BASE}/transactions/processed`, () => HttpResponse.json([refund]))
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    await checkRow(1)
    await checkRow(2)
    await user.click(await screen.findByRole('button', { name: /^merge$/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/mix money in with money out/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^merge$/i })).toBeDisabled()
  })

  it('moves a processed row back to review from the row menu', async () => {
    const processed = makeProcessedTransaction({
      id: 'proc-9',
      raw_txn_id: 'raw-9',
      description: 'Swiggy IND',
      amount: '481.65',
      effective_amount: '481.65',
    })
    let unprocessed: string | null = null
    server.use(
      http.get(`${BASE}/transactions/processed`, () => HttpResponse.json([processed])),
      http.post(`${BASE}/transactions/processed/:id/unprocess`, ({ params }) => {
        unprocessed = params.id as string
        return HttpResponse.json(
          makeRawTransaction({ id: 'raw-9', description: 'Swiggy IND', amount: '481.65' })
        )
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    await user.click(await screen.findByRole('button', { name: /more actions/i }))
    await user.click(await screen.findByRole('button', { name: /move back to review/i }))

    await waitFor(() => expect(unprocessed).toBe('proc-9'))
    expect(await screen.findByText(/moved back to review/i)).toBeInTheDocument()
  })

  it('offers Merge only once more than one row is checked', async () => {
    const raw1 = makeRawTransaction({ id: 'raw-a', description: 'A', amount: '10.00' })
    const raw2 = makeRawTransaction({ id: 'raw-b', description: 'B', amount: '20.00' })
    server.use(http.get(`${BASE}/transactions/raw`, () => HttpResponse.json([raw1, raw2])))

    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    await checkRow(1)
    expect(await screen.findByRole('button', { name: /bulk categorise/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^merge$/i })).not.toBeInTheDocument()

    await checkRow(2)
    expect(await screen.findByRole('button', { name: /^merge$/i })).toBeInTheDocument()
  })
})
