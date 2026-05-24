import { useEffect, useRef, useState } from 'react'

import { Button } from './Button'

interface PasswordPromptDialogProps {
  isOpen: boolean
  fileName: string
  /** Error from the previous attempt (e.g. "Incorrect password"). Shown
   *  inline; cleared on a fresh submit by the parent. */
  errorMessage?: string
  loading?: boolean
  onSubmit: (password: string) => void
  onCancel: () => void
}

/** Asks the user for a password to decrypt an encrypted PDF.
 *
 *  Strict no-persistence: the typed value lives in this component's state
 *  for the lifetime of the open dialog and is cleared on close. Parents
 *  hold the in-memory password only while the upload is in flight; no
 *  localStorage / sessionStorage involvement.
 */
export function PasswordPromptDialog({
  isOpen,
  fileName,
  errorMessage,
  loading = false,
  onSubmit,
  onCancel,
}: PasswordPromptDialogProps) {
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset on each open so a previous typed value never bleeds across files.
  useEffect(() => {
    if (!isOpen) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassword('')
    // Focus shortly after the dialog enters so the animation doesn't fight
    // the focus jump.
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [isOpen])

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    onSubmit(password)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px] md:p-10"
      style={{
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        animation: 'fade-up .15s ease',
      }}
      role="dialog"
      aria-modal
      aria-label="Enter PDF password"
    >
      <div className="absolute inset-0" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: 'pop .18s ease' }}
      >
        <div className="border-b border-[var(--line)] px-5 pt-[18px] pb-3">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: 'var(--ink-3)' }}
              aria-hidden
            >
              lock
            </span>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
              Password-protected PDF
            </h2>
          </div>
          <p className="mt-1 truncate text-[12px] text-[var(--ink-3)]" title={fileName}>
            {fileName}
          </p>
        </div>

        <div className="flex flex-col gap-3 px-5 py-[18px]">
          <p className="text-[12.5px] leading-[1.5] text-[var(--ink-3)]">
            Enter the password to unlock this statement. The password is used once to decrypt in
            memory and never stored.
          </p>
          <div>
            <label className="eyebrow mb-1 block" htmlFor="pdf-password-input">
              Password
            </label>
            <input
              id="pdf-password-input"
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={loading}
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? 'pdf-password-error' : undefined}
            />
            {errorMessage && (
              <p
                id="pdf-password-error"
                className="mt-1.5 text-[11.5px]"
                style={{ color: 'var(--neg)' }}
              >
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
          <Button variant="tertiary" size="sm" onClick={onCancel} disabled={loading} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={loading} type="submit" disabled={!password}>
            Unlock
          </Button>
        </div>
      </form>
    </div>
  )
}
