/**
 * Regression tests for the Phase 8c second-pass keyboard-sweep finding:
 * every dialog in the app (AddTransactionDialog, KeyboardShortcutsModal,
 * ImportDialog, PasswordPromptDialog, WelcomeModal) left focus wherever the
 * dialog's own content had put it (often `<body>`, since several
 * `autoFocus` their own field) instead of returning it to whatever
 * triggered the dialog. Confirmed live: opening the keyboard-shortcuts
 * overlay with the trigger button focused, then closing it with Escape,
 * left focus on `<body>` — a keyboard user has to start over from the top
 * of the page after every dialog.
 *
 * These tests cover both call shapes `useFocusReturn` supports, and the
 * specific trap that broke the first implementation attempt: a dialog that
 * `autoFocus`es its own field must still restore focus to the ORIGINAL
 * trigger, not to whatever the dialog focused internally (autoFocus runs
 * synchronously during mount, before a plain `useEffect` would read
 * `document.activeElement`).
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { useFocusReturn } from './useFocusReturn'

function MountUnmountDialog({ onClose }: { onClose: () => void }) {
  useFocusReturn()
  return (
    <div role="dialog">
      {/* Mirrors AddTransactionDialog's autoFocus'd description field — the
       * case that broke a plain useEffect-based capture. */}
      <input autoFocus placeholder="dialog field" />
      <button onClick={onClose}>Close</button>
    </div>
  )
}

function MountUnmountHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <MountUnmountDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function IsOpenDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useFocusReturn(isOpen)
  if (!isOpen) return null
  return (
    <div role="dialog">
      <input autoFocus placeholder="dialog field" />
      <button onClick={onClose}>Close</button>
    </div>
  )
}

function IsOpenHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <IsOpenDialog isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

describe('useFocusReturn', () => {
  it('conditionally-rendered dialog: returns focus to the trigger, not the autoFocus field', async () => {
    const user = userEvent.setup()
    render(<MountUnmountHarness />)

    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    await user.click(openButton)

    // The dialog's own field grabbed focus via autoFocus.
    expect(screen.getByPlaceholderText('dialog field')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })

  it('isOpen-prop dialog (always mounted): returns focus to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<IsOpenHarness />)

    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    await user.click(openButton)

    expect(screen.getByPlaceholderText('dialog field')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })
})
