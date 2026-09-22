/**
 * Flow test for copying a row into another month.
 *
 * The gap it closes: a charge the bank never reports — rent paid in cash, a
 * SIP outside the imported account — had to be typed out again every month,
 * category, tags and splits included.
 */
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { TransactionsPage } from '@/pages/TransactionsPage'

import { makeProcessedTransaction, makeRawTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

const BASE = 'http://localhost:8000'

interface RawBody {
  txn_date: string
  description: string
  amount: number
  txn_type?: string
}

interface ProcessBody {
  raw_txn_id: string
  category_id: string
  save_mapping: boolean
  shares: { person_id: string; share_type: string; share_value: number }[]
  notes: string | null
  tag_ids?: string[]
  txn_type?: string
}

describe('copy a transaction to another month', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  /** Opens the row's "…" menu and picks Copy, landing in the dialog. */
  async function openCopyDialog(user: ReturnType<typeof userEvent.setup>) {
    const table = await screen.findByRole('table')
    await user.click(within(table).getByRole('button', { name: /more actions/i }))
    await user.click(await screen.findByRole('button', { name: /copy to month/i }))
    return screen.findByRole('dialog')
  }

  it('repeats a categorised row in the next month with its category, tags and splits', async () => {
    const processed = makeProcessedTransaction({
      id: 'proc-rent',
      raw_txn_id: 'raw-rent',
      category_id: 'cat-1',
      category: 'Groceries',
      description: 'Rent',
      txn_date: '2026-05-01',
      amount: '17973.00',
      effective_amount: '17973.00',
      notes: 'May rent',
      tags: [{ id: 'tag-rent', name: 'rent' }],
      shares: [
        {
          person_id: 'person-a',
          person_name: 'A',
          share_type: 'percentage',
          share_value: '50',
          share_amount: '8986.50',
          settled: false,
        },
      ],
    })

    let rawBody: RawBody | null = null
    let processBody: ProcessBody | null = null
    server.use(
      http.get(`${BASE}/transactions/processed`, () => HttpResponse.json([processed])),
      http.post(`${BASE}/transactions/raw`, async ({ request }) => {
        rawBody = (await request.json()) as RawBody
        return HttpResponse.json(
          makeRawTransaction({ id: 'raw-copy', description: 'Rent', amount: '17973.00' }),
          { status: 201 }
        )
      }),
      http.post(`${BASE}/transactions/process`, async ({ request }) => {
        processBody = (await request.json()) as ProcessBody
        return HttpResponse.json(makeProcessedTransaction({ id: 'proc-copy' }))
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const dialog = await openCopyDialog(user)
    // Defaults to the month after the source, so the common "repeat it" case
    // is a single click.
    expect(within(dialog).getByText('June 2026')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^copy$/i }))

    await waitFor(() => expect(processBody).not.toBeNull())
    expect(rawBody).toEqual({
      txn_date: '2026-06-01T00:00:00',
      description: 'Rent',
      amount: 17973,
      txn_type: 'expense',
    })
    expect(processBody).toEqual({
      raw_txn_id: 'raw-copy',
      category_id: 'cat-1',
      // A copy repeats one charge; it is not the user teaching a rule.
      save_mapping: false,
      shares: [{ person_id: 'person-a', share_type: 'percentage', share_value: 50 }],
      notes: 'May rent',
      tag_ids: ['tag-rent'],
      txn_type: 'expense',
    })
    expect(await screen.findByText(/copied to june 2026/i)).toBeInTheDocument()
  })

  it('steps to any month and clamps the day to one that exists', async () => {
    const processed = makeProcessedTransaction({
      id: 'proc-eom',
      description: 'Card sweep',
      txn_date: '2026-05-31',
      amount: '1200.00',
      effective_amount: '1200.00',
    })

    let rawBody: RawBody | null = null
    server.use(
      http.get(`${BASE}/transactions/processed`, () => HttpResponse.json([processed])),
      http.post(`${BASE}/transactions/raw`, async ({ request }) => {
        rawBody = (await request.json()) as RawBody
        return HttpResponse.json(makeRawTransaction({ id: 'raw-copy-2' }), { status: 201 })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const dialog = await openCopyDialog(user)
    // May 31 → June 30 by default; four steps back lands on February.
    expect(within(dialog).getByText('June 2026')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /previous month/i }))
    await user.click(within(dialog).getByRole('button', { name: /previous month/i }))
    await user.click(within(dialog).getByRole('button', { name: /previous month/i }))
    await user.click(within(dialog).getByRole('button', { name: /previous month/i }))
    expect(within(dialog).getByText('February 2026')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^copy$/i }))

    await waitFor(() => expect(rawBody).not.toBeNull())
    expect(rawBody!.txn_date).toBe('2026-02-28T00:00:00')
  })

  it('copies an uncategorised row as a plain pending row, with no process call', async () => {
    const raw = makeRawTransaction({
      id: 'raw-pending',
      description: 'UPI-DOMINOS',
      amount: '368.82',
      txn_date: '2026-05-18',
    })

    let processCalls = 0
    let rawBody: RawBody | null = null
    server.use(
      http.get(`${BASE}/transactions/raw`, () => HttpResponse.json([raw])),
      http.post(`${BASE}/transactions/raw`, async ({ request }) => {
        rawBody = (await request.json()) as RawBody
        return HttpResponse.json(makeRawTransaction({ id: 'raw-copy-3' }), { status: 201 })
      }),
      http.post(`${BASE}/transactions/process`, () => {
        processCalls += 1
        return HttpResponse.json(makeProcessedTransaction())
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    const dialog = await openCopyDialog(user)
    expect(within(dialog).getByText(/lands in needs review/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^copy$/i }))

    await waitFor(() => expect(rawBody).not.toBeNull())
    expect(rawBody!.txn_date).toBe('2026-06-18T00:00:00')
    expect(processCalls).toBe(0)
    expect(await screen.findByText(/needs a category there too/i)).toBeInTheDocument()
  })
})
