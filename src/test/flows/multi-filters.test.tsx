/**
 * Regression tests for multi-value category/tag filters on Transactions
 * (`src/features/transactions/page.tsx`).
 *
 * Bug this guards against: `categoryFilter`/`tagFilter` used to be single
 * strings, so a power user could only ever narrow to one category or one
 * tag at a time. They're now arrays — OR within a filter type, AND across
 * types — and every selected value gets its own removable chip.
 */
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { TransactionsPage } from '@/pages/TransactionsPage'

import { makeCategory, makeProcessedTransaction, makeTag } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

const tagWork = makeTag({ id: 'tag-work', name: 'work' })
const tagPersonal = makeTag({ id: 'tag-personal', name: 'personal' })
// A third category that none of the "cat-1"/"cat-2" filter tests select —
// without it, cat-1 + cat-2 would cover every fixture row and a category
// filter could never actually exclude anything.
const catEntertainment = makeCategory({ id: 'cat-3', name: 'Entertainment' })

function setUpTransactions() {
  const t1 = makeProcessedTransaction({
    id: 'p1',
    description: 'Big Bazaar',
    category_id: 'cat-1',
    category: 'Groceries',
    effective_amount: '-100.00',
    tags: [],
  })
  const t2 = makeProcessedTransaction({
    id: 'p2',
    description: 'Uber ride',
    category_id: 'cat-2',
    category: 'Transport',
    effective_amount: '-200.00',
    tags: [],
  })
  const t3 = makeProcessedTransaction({
    id: 'p3',
    description: 'Office snacks',
    category_id: 'cat-1',
    category: 'Groceries',
    effective_amount: '-50.00',
    tags: [tagWork],
  })
  const t4 = makeProcessedTransaction({
    id: 'p4',
    description: 'Cab to client',
    category_id: 'cat-2',
    category: 'Transport',
    effective_amount: '-300.00',
    tags: [tagWork],
  })
  const t5 = makeProcessedTransaction({
    id: 'p5',
    description: 'Weekend trip',
    category_id: 'cat-3',
    category: 'Entertainment',
    effective_amount: '-900.00',
    tags: [tagPersonal],
  })

  server.use(
    http.get('http://localhost:8000/tags', () => HttpResponse.json([tagWork, tagPersonal])),
    http.get('http://localhost:8000/categories', () =>
      HttpResponse.json([
        makeCategory({ id: 'cat-1', name: 'Groceries', txn_count: 2 }),
        makeCategory({ id: 'cat-2', name: 'Transport', txn_count: 2 }),
        catEntertainment,
      ])
    ),
    http.get('http://localhost:8000/transactions/processed', () =>
      HttpResponse.json([t1, t2, t3, t4, t5])
    )
  )
}

async function selectMultiOption(user: ReturnType<typeof userEvent.setup>, name: string) {
  const input = screen.getByPlaceholderText(name)
  await user.click(input)
  return input
}

describe('Transactions multi-select category/tag filters', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token')
    setUpTransactions()
  })

  afterEach(() => {
    localStorage.removeItem('access_token')
  })

  it('two categories + a tag intersect correctly, chips remove individually, clear-all resets, and bulk select-all respects the filter', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />, { initialEntries: ['/transactions'] })

    // The table only renders once data has loaded, so waiting for it also
    // guarantees the summary/filtered state below reflects loaded data —
    // `[data-testid="txn-summary"]` exists from the very first render (with
    // placeholder "0 transactions" text) so it isn't itself a safe wait
    // target.
    let table = await screen.findByRole('table')
    // All 5 unfiltered rows visible first (desktop table only — the mobile
    // card list duplicates the same descriptions and would make text
    // queries ambiguous).
    expect(within(table).getByText('Big Bazaar')).toBeInTheDocument()

    // Open the Filters popover.
    await user.click(screen.getByRole('button', { name: /filters/i }))
    const popover = screen.getByRole('menu')

    // Pick Groceries and Transport from the category MultiSelect (OR
    // within the category filter). Scoped to the popover — "Groceries" also
    // appears as a table cell in the (unfiltered) rows behind it.
    await selectMultiOption(user, 'Search categories…')
    await user.click(await within(popover).findByText('Groceries'))
    await selectMultiOption(user, 'Search categories…')
    await user.click(await within(popover).findByText('Transport'))

    // Pick "work" from the tag MultiSelect (AND across filter types).
    await selectMultiOption(user, 'Search tags…')
    await user.click(await within(popover).findByText('work'))

    // Only p3 (Groceries+work) and p4 (Transport+work) satisfy
    // category IN (Groceries, Transport) AND tag IN (work).
    await screen.findByText(/^2 transactions/, { selector: '[data-testid="txn-summary"]' })
    table = screen.getByRole('table')
    expect(within(table).getByText('Office snacks')).toBeInTheDocument()
    expect(within(table).getByText('Cab to client')).toBeInTheDocument()
    expect(within(table).queryByText('Big Bazaar')).not.toBeInTheDocument()
    expect(within(table).queryByText('Uber ride')).not.toBeInTheDocument()
    expect(within(table).queryByText('Weekend trip')).not.toBeInTheDocument()

    // Each active value has its own removable chip in the toolbar's row 2.
    expect(screen.getByRole('button', { name: 'Remove category filter: Groceries' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove category filter: Transport' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove tag filter: work' })).toBeTruthy()

    // The Filters button's badge counts VALUES (3), not filter types (2).
    // (Matched with a leading anchor — "Clear filters" also contains
    // "filters" and is now visible in the toolbar's row 2.)
    const filtersBtn = screen.getByRole('button', { name: /^filters/i })
    expect(within(filtersBtn).getByText('3')).toBeInTheDocument()

    // Removing the Transport chip narrows to just p3.
    await user.click(screen.getByRole('button', { name: 'Remove category filter: Transport' }))
    await screen.findByText(/^1 transaction\b/, { selector: '[data-testid="txn-summary"]' })
    table = screen.getByRole('table')
    expect(within(table).getByText('Office snacks')).toBeInTheDocument()
    expect(within(table).queryByText('Cab to client')).not.toBeInTheDocument()

    // Select-all now operates on the filtered set (1 row), not the
    // unfiltered 5.
    const headerCheckbox = within(table).getAllByRole('checkbox')[0]
    await user.click(headerCheckbox)
    // "1 selected" legitimately renders in more than one place (the bulk
    // actions bar and the row's own detail panel) — assert at least one.
    await screen.findAllByText('1 selected')

    // Clear filters removes every chip and restores all rows.
    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(
      screen.queryByRole('button', { name: 'Remove category filter: Groceries' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remove tag filter: work' })
    ).not.toBeInTheDocument()
    await screen.findByText(/^5 transactions/, { selector: '[data-testid="txn-summary"]' })
  })

  it('multi-category filter is URL-driven and survives a direct link (e.g. Category page hand-off)', async () => {
    renderWithProviders(<TransactionsPage />, {
      initialEntries: ['/transactions?category=cat-1&category=cat-2'],
    })

    const table = await screen.findByRole('table')
    await screen.findByText(/^4 transactions/, { selector: '[data-testid="txn-summary"]' })
    expect(within(table).getByText('Big Bazaar')).toBeInTheDocument()
    expect(within(table).getByText('Uber ride')).toBeInTheDocument()
    expect(within(table).getByText('Office snacks')).toBeInTheDocument()
    expect(within(table).getByText('Cab to client')).toBeInTheDocument()
    expect(within(table).queryByText('Weekend trip')).not.toBeInTheDocument()
  })

  it('accepts a single-value legacy link (Category page hand-off format)', async () => {
    renderWithProviders(<TransactionsPage />, {
      initialEntries: ['/transactions?category=cat-1'],
    })

    const table = await screen.findByRole('table')
    await screen.findByText(/^2 transactions/, { selector: '[data-testid="txn-summary"]' })
    expect(within(table).getByText('Big Bazaar')).toBeInTheDocument()
    expect(within(table).getByText('Office snacks')).toBeInTheDocument()
    expect(within(table).queryByText('Uber ride')).not.toBeInTheDocument()
  })
})
