/**
 * Phase 9, Part 4: ConfirmDialog, CategoryDeleteDialog and AddBudgetModal
 * were the three dialogs in the app left without `role="dialog"`,
 * `aria-modal` or Escape handling when the rest of the app's dialogs were
 * brought up to that standard in Phase 8c (see
 * docs/ledger-sweep-findings.md and the `useFocusReturn` hook's own
 * history). This brings them in line with the other five dialogs
 * (AddTransactionDialog, ImportDialog, KeyboardShortcutsModal,
 * PasswordPromptDialog, WelcomeModal) and locks the parity in place.
 */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AddBudgetModal } from '@/features/budget/components/AddBudgetModal'
import { CategoryDeleteDialog } from '@/features/budget/components/CategoryDeleteDialog'
import type { Category } from '@/types/settings'

import { renderWithProviders } from '../renderWithProviders'

const categories: Category[] = [
  { id: 'cat-1', name: 'Groceries', is_income: false },
  { id: 'cat-2', name: 'Transport', is_income: false },
]

describe('ConfirmDialog a11y parity', () => {
  it('exposes role="dialog", aria-modal and an accessible name from the title', () => {
    renderWithProviders(
      <ConfirmDialog
        isOpen
        title="Delete this transaction?"
        message="This can't be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Delete this transaction?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('Escape calls onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(
      <ConfirmDialog
        isOpen
        title="Delete this transaction?"
        message="This can't be undone."
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('CategoryDeleteDialog a11y parity', () => {
  it('exposes role="dialog", aria-modal and an accessible name from the title', () => {
    renderWithProviders(
      <CategoryDeleteDialog
        isOpen
        categoryId="cat-1"
        categoryName="Groceries"
        txnCount={0}
        categories={categories}
        onConfirm={() => {}}
        onCancel={() => {}}
        loading={false}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Delete “Groceries”' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('Escape calls onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderWithProviders(
      <CategoryDeleteDialog
        isOpen
        categoryId="cat-1"
        categoryName="Groceries"
        txnCount={0}
        categories={categories}
        onConfirm={() => {}}
        onCancel={onCancel}
        loading={false}
      />
    )
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when categoryId is null (no phantom dialog role)', () => {
    renderWithProviders(
      <CategoryDeleteDialog
        isOpen
        categoryId={null}
        categoryName=""
        txnCount={0}
        categories={categories}
        onConfirm={() => {}}
        onCancel={() => {}}
        loading={false}
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('AddBudgetModal a11y parity', () => {
  it('exposes role="dialog", aria-modal and an accessible name from the title', () => {
    renderWithProviders(
      <AddBudgetModal
        categories={categories}
        existingCategoryIds={new Set()}
        year={2026}
        mode="fy"
        onClose={() => {}}
        onSaved={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Add budget entries' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('Escape calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <AddBudgetModal
        categories={categories}
        existingCategoryIds={new Set()}
        year={2026}
        mode="fy"
        onClose={onClose}
        onSaved={() => {}}
      />
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
