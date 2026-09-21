import { useEffect, useId } from 'react'

import { useFocusReturn } from '@/hooks/useFocusReturn'

import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  danger?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: ConfirmDialogProps) {
  const titleId = useId()

  useFocusReturn(isOpen)

  // Phase 9: this dialog (along with CategoryDeleteDialog and
  // AddBudgetModal) was left out of the role="dialog"/Escape/focus-return
  // pass that brought the other five dialogs in the app up to standard —
  // see docs/ledger-sweep-findings.md. Same pattern as ImportDialog /
  // AddTransactionDialog: a window keydown listener, gated on `isOpen`.
  useEffect(() => {
    if (!isOpen) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px] md:p-10"
      style={{
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        animation: 'fade-up .15s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0" onClick={onCancel} />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: 'pop .18s ease' }}
      >
        <div className="border-b border-[var(--line)] px-5 pt-[18px] pb-3">
          <h2
            id={titleId}
            className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]"
          >
            {title}
          </h2>
        </div>
        <div className="overflow-auto px-5 py-[18px]">
          <p className="text-[13px] leading-[1.55] text-[var(--ink-2)]">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
          <Button variant="tertiary" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
