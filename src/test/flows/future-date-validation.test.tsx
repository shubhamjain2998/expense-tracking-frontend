/**
 * Regression tests for the Phase 8c second-pass adversarial-data finding:
 * none of the app's three date-entry surfaces (quick-add, manual entry,
 * edit) rejected a transaction dated decades in the future. Live testing
 * confirmed a transaction dated 2099-06-15 was silently accepted with no
 * warning — it vanishes from every normal monthly view (it only surfaces if
 * a user happens to browse to year 2099), so a fat-fingered year (e.g.
 * "2029" typed as "2099") silently misfiles a transaction with no feedback.
 *
 * Fix: all three date inputs now carry `max={todayIsoDate()}` (soft browser
 * guard) and their submit handlers explicitly reject a future date with a
 * clear message — belt-and-suspenders, since `max` alone doesn't stop a
 * value set programmatically or a typed value in browsers that don't clamp.
 *
 * Past dates (e.g. 1970) are deliberately still allowed — backdating a
 * historical transaction is a legitimate use case the brief also asked to
 * verify stays working.
 *
 * These tests fire `submit` on the `<form>` directly (rather than clicking
 * the submit `<button>`) — clicking a `type="submit"` Button through
 * `userEvent.click()` did not reliably reach the form's `onSubmit` in this
 * suite's jsdom environment, which would have made every assertion below a
 * false negative (handleSubmit never ran, so no error and no stale-value
 * reset either — both readings looked plausible until traced with a direct
 * console.log inside handleSubmit). Firing the DOM `submit` event is the
 * standard, reliable way to exercise a form's `onSubmit` handler.
 */
import { fireEvent, screen } from '@testing-library/react'

import { AddTransactionDialog } from '@/components/ui/AddTransactionDialog'
import { EditPanel } from '@/features/transactions/components/EditPanel'
import { ManualEntryPanel } from '@/features/upload/components/ManualEntryPanel'
import { todayIsoDate } from '@/lib/format'

import { makeProcessedTransaction } from '../factories'
import { renderWithProviders } from '../renderWithProviders'

function futureDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 50)
  return d.toISOString().slice(0, 10)
}

const PAST_DATE = '1970-01-15'

describe('future-dated transactions are rejected, past dates still work', () => {
  it('AddTransactionDialog: max attribute is today; submitting a future date shows an error', async () => {
    const { container } = renderWithProviders(<AddTransactionDialog onClose={() => {}} />)

    const dateInput = await screen.findByLabelText('Date')
    expect(dateInput).toHaveAttribute('max', todayIsoDate())

    fireEvent.change(dateInput, { target: { value: futureDate() } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Future test' } })
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '100' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(await screen.findByText('Date cannot be in the future')).toBeInTheDocument()
  })

  it('AddTransactionDialog: a 1970 date passes date validation (no future-date error)', async () => {
    const { container } = renderWithProviders(<AddTransactionDialog onClose={() => {}} />)

    const dateInput = await screen.findByLabelText('Date')
    fireEvent.change(dateInput, { target: { value: PAST_DATE } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Old test' } })
    // Leave amount blank so the form still fails validation overall (avoids
    // firing a real mutation) — we only care that a 1970 date alone doesn't
    // produce the future-date error.
    fireEvent.submit(container.querySelector('form')!)

    expect(await screen.findByText('Enter a valid amount')).toBeInTheDocument()
    expect(screen.queryByText('Date cannot be in the future')).not.toBeInTheDocument()
  })

  it('ManualEntryPanel: max attribute is today; submitting a future date shows an error', async () => {
    const { container } = renderWithProviders(<ManualEntryPanel />)

    const dateInput = await screen.findByLabelText('Date')
    expect(dateInput).toHaveAttribute('max', todayIsoDate())

    fireEvent.change(dateInput, { target: { value: futureDate() } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Future test' } })
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '100' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(await screen.findByText('Date cannot be in the future')).toBeInTheDocument()
  })

  it('ManualEntryPanel: a 1970 date passes date validation (no future-date error)', async () => {
    const { container } = renderWithProviders(<ManualEntryPanel />)

    const dateInput = await screen.findByLabelText('Date')
    fireEvent.change(dateInput, { target: { value: PAST_DATE } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Old test' } })
    fireEvent.submit(container.querySelector('form')!)

    expect(await screen.findByText('Enter a valid positive amount')).toBeInTheDocument()
    expect(screen.queryByText('Date cannot be in the future')).not.toBeInTheDocument()
  })

  it('EditPanel: date input carries max=today, and saving a future date is blocked with a toast', async () => {
    const txn = makeProcessedTransaction()
    renderWithProviders(
      <EditPanel
        txn={txn}
        categories={[]}
        onClose={() => {}}
        onSaved={() => {}}
        onCopy={() => {}}
      />
    )

    const dateInput = await screen.findByLabelText('Date')
    expect(dateInput).toHaveAttribute('max', todayIsoDate())

    fireEvent.change(dateInput, { target: { value: futureDate() } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Date cannot be in the future')).toBeInTheDocument()
  })
})
