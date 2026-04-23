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
      className="fixed inset-0 z-50 grid place-items-center"
      style={{
        padding: 40,
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        backdropFilter: 'blur(8px)',
        animation: 'fade-up .15s ease',
      }}
    >
      <div className="absolute inset-0" onClick={onCancel} />
      <div
        className="relative z-10 flex w-full max-w-md flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'pop .18s ease',
          maxHeight: '90vh',
        }}
      >
        <div
          className="px-5"
          style={{ padding: '18px 20px 12px', borderBottom: '1px solid var(--line)' }}
        >
          <h2
            className="text-[15px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
          >
            {title}
          </h2>
        </div>
        <div className="overflow-auto" style={{ padding: '18px 20px' }}>
          <p className="text-[13px]" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {message}
          </p>
        </div>
        <div
          className="flex justify-end gap-2"
          style={{ padding: '12px 20px', borderTop: '1px solid var(--line)' }}
        >
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
