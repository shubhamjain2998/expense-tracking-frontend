/**
 * Regression test for the Phase 8c second-pass concurrency finding:
 * EditPanel's Save always sent its *entire* local snapshot, including
 * fields the user never touched. Live testing reproduced the resulting
 * clobber: open EditPanel for a row, then (without closing it) categorise
 * that same row from elsewhere — the keyboard 1–9 shortcut, drag-to-
 * categorise, and bulk actions can all target it while the panel is still
 * open — then click "Save changes" in the untouched panel. Since `txn` is a
 * snapshot captured once when the panel opened and never refreshed (see
 * `settle-toggle-staleness.test.tsx` for the sibling bug this shares a root
 * cause with), the panel's own `categoryId` state was still the OLD
 * category, and Save unconditionally included `category_id` in the PATCH —
 * silently reverting the concurrent change the instant Save was clicked.
 * Confirmed against the real backend: category flips to the new value via
 * the keyboard shortcut, then flips right back to the old value on Save.
 *
 * Fix: handleSave now builds the PATCH payload from only the fields that
 * differ from `txn`'s original values, matching the backend's existing
 * partial-update contract (`if body.field is not None: ...` per field) —
 * no backend change needed.
 */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import { EditPanel } from '@/features/transactions/components/EditPanel'
import type { Category } from '@/types/settings'

import { makeProcessedTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'
import { server } from '../server'

const BASE = 'http://localhost:8000'

const categories: Category[] = [
  { id: 'cat-food', name: 'food', is_income: false },
  { id: 'cat-health', name: 'health', is_income: false },
]

function capturePatchBody() {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.patch(`${BASE}/transactions/processed/:id`, async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.push(body)
      return HttpResponse.json({ id: params.id, ...body })
    })
  )
  return bodies
}

describe('EditPanel Save only sends fields the user actually touched', () => {
  it('omits category_id from the PATCH when the user only edited notes', async () => {
    const bodies = capturePatchBody()
    const user = userEvent.setup()
    const txn = makeProcessedTransaction({ category_id: 'cat-food', notes: null })
    renderWithProviders(
      <EditPanel
        txn={txn}
        categories={categories}
        onClose={() => {}}
        onSaved={() => {}}
        onCopy={() => {}}
      />
    )

    const notesField = await screen.findByLabelText('Notes (optional)')
    await user.type(notesField, 'left a note')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(bodies).toHaveLength(1)
    expect(bodies[0]).not.toHaveProperty('category_id')
    expect(bodies[0]).not.toHaveProperty('amount')
    expect(bodies[0]).not.toHaveProperty('description')
    expect(bodies[0].notes).toBe('left a note')
  })

  it('includes category_id when the user actually changed the category', async () => {
    const bodies = capturePatchBody()
    const user = userEvent.setup()
    const txn = makeProcessedTransaction({ category_id: 'cat-food' })
    renderWithProviders(
      <EditPanel
        txn={txn}
        categories={categories}
        onClose={() => {}}
        onSaved={() => {}}
        onCopy={() => {}}
      />
    )

    const categoryInput = await screen.findByPlaceholderText('Search categories…')
    await user.clear(categoryInput)
    await user.type(categoryInput, 'health')
    await user.click(await screen.findByRole('option', { name: 'health' }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(bodies).toHaveLength(1)
    expect(bodies[0].category_id).toBe('cat-health')
  })

  it('a concurrent category change from elsewhere survives an untouched Save', async () => {
    // Simulates the exact live-tested race: the transaction's category
    // changes server-side (e.g. via the keyboard shortcut) while this panel
    // is open with the OLD category still in its local state. The PATCH
    // this panel sends must not include category_id at all.
    const bodies = capturePatchBody()
    const user = userEvent.setup()
    const txn = makeProcessedTransaction({ category_id: 'cat-food', description: 'Hungerbox' })
    renderWithProviders(
      <EditPanel
        txn={txn}
        categories={categories}
        onClose={() => {}}
        onSaved={() => {}}
        onCopy={() => {}}
      />
    )

    // User only touches the description — never the category field.
    const descField = await screen.findByLabelText('Description')
    await user.clear(descField)
    await user.type(descField, 'Hungerbox lunch')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(bodies).toHaveLength(1)
    expect(bodies[0]).not.toHaveProperty('category_id')
    expect(bodies[0].description).toBe('Hungerbox lunch')
  })
})

describe('EditPanel "Save as rule"', () => {
  it('is off by default, so a one-off correction does not rewrite the rule', async () => {
    const bodies = capturePatchBody()
    const user = userEvent.setup()
    const txn = makeProcessedTransaction({ category_id: 'cat-food', notes: null })
    renderWithProviders(
      <EditPanel
        txn={txn}
        categories={categories}
        onClose={() => {}}
        onSaved={() => {}}
        onCopy={() => {}}
      />
    )

    await user.type(screen.getByLabelText(/notes/i), 'one-off')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findByText(/transaction updated/i)
    expect(bodies).toHaveLength(1)
    expect(bodies[0].save_mapping).toBeUndefined()
  })

  it('sends save_mapping when the toggle is on, letting the backend teach the rule', async () => {
    const bodies = capturePatchBody()
    const user = userEvent.setup()
    const txn = makeProcessedTransaction({ category_id: 'cat-food', notes: null })
    renderWithProviders(
      <EditPanel
        txn={txn}
        categories={categories}
        onClose={() => {}}
        onSaved={() => {}}
        onCopy={() => {}}
      />
    )

    await user.click(screen.getByRole('button', { name: /save as rule/i }))
    await user.type(screen.getByLabelText(/notes/i), 'from now on')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findByText(/transaction updated/i)
    expect(bodies).toHaveLength(1)
    expect(bodies[0].save_mapping).toBe(true)
  })
})
