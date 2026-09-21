/**
 * Regression tests for the Phase 8c second-pass a11y sweep: every
 * interactive input needs a programmatic label (MASTER.md §9). These
 * components used to rely on a visible `<label>` with no `htmlFor`
 * (or an `aria-label` on the input with no association back to the
 * visible label), which `eslint-plugin-jsx-a11y`'s
 * `label-has-associated-control` rule (now enabled in eslint.config.js)
 * catches statically — these tests catch it at the DOM level too, so a
 * future edit that silently drops the `id`/`htmlFor`/`name` pairing (but
 * keeps the JSX structure lint-clean, e.g. by re-adding a redundant
 * aria-label) still fails a test, not just a lint rule.
 */
import { screen } from '@testing-library/react'

import { AddTransactionDialog } from '@/components/ui/AddTransactionDialog'
import { PersonsSection } from '@/features/settings/components/PersonsSection'
import { TagsSection } from '@/features/settings/components/TagsSection'
import { ManualEntryPanel } from '@/features/upload/components/ManualEntryPanel'

import { renderWithProviders } from '../renderWithProviders'

describe('form input label association (a11y sweep)', () => {
  it('AddTransactionDialog: Date, Description and Amount are reachable by label; Type is a labelled group', async () => {
    renderWithProviders(<AddTransactionDialog onClose={() => {}} />)

    expect(await screen.findByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (₹)')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Type' })).toBeInTheDocument()
  })

  it('ManualEntryPanel: Date, Description and Amount are reachable by label; Type is a labelled group', async () => {
    renderWithProviders(<ManualEntryPanel />)

    expect(await screen.findByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount (₹)')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Type' })).toBeInTheDocument()
  })

  it('Settings → People: "Add member" input is reachable by label', async () => {
    renderWithProviders(<PersonsSection />)
    expect(await screen.findByLabelText('Add member')).toBeInTheDocument()
  })

  it('Settings → Tags: "Create tag" input is reachable by label', async () => {
    renderWithProviders(<TagsSection />)
    expect(await screen.findByLabelText('Create tag')).toBeInTheDocument()
  })
})
