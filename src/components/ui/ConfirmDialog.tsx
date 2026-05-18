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
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-10 backdrop-blur-[8px]"
      style={{
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        animation: 'fade-up .15s ease',
      }}
    >
      <div className="absolute inset-0" onClick={onCancel} />
      <div
        className="relative z-10 flex w-full max-w-md flex-col bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius-lg)] shadow-[var(--shadow-pop)] max-h-[90vh]"
        style={{ animation: 'pop .18s ease' }}
      >
        <div className="pt-[18px] px-5 pb-3 border-b border-[var(--line)]">
          <h2 className="text-[15px] font-semibold text-[var(--ink)] tracking-[-0.01em]">
            {title}
          </h2>
        </div>
        <div className="overflow-auto py-[18px] px-5">
          <p className="text-[13px] text-[var(--ink-2)] leading-[1.55]">{message}</p>
        </div>
        <div className="flex justify-end gap-2 py-3 px-5 border-t border-[var(--line)]">
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
